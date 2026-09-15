<template>
  <div class="page-container">
    <t-card :bordered="false" class="page-card">
      <template #title>
        <div class="card-title">
          <span>RSS 订阅源管理</span>
          <span class="card-title__hint">共 {{ list.length }} 个订阅源</span>
        </div>
      </template>

      <template #actions>
        <t-button v-if="userStore.hasPermission('rss:create')" theme="primary" @click="handleCreate">
          <template #icon><t-icon name="add" /></template>
          新建订阅源
        </t-button>
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
        <template #title="{ row }">
          <div class="title-cell">
            <span class="feed-title">{{ row.title || '（未命名）' }}</span>
            <t-tooltip v-if="row.lastError" :content="row.lastError" placement="top-left">
              <t-tag theme="danger" variant="light-outline" size="small" class="error-tag">
                <template #icon><t-icon name="error-circle" /></template>
                抓取失败
              </t-tag>
            </t-tooltip>
          </div>
        </template>

        <template #siteUrl="{ row }">
          <t-link
            v-if="row.siteUrl"
            theme="primary"
            hover="color"
            @click="openSite(row.siteUrl)"
          >
            {{ row.siteUrl }}
          </t-link>
          <span v-else class="text-muted">—</span>
        </template>

        <template #feedUrl="{ row }">
          <t-link
            v-if="row.feedUrl"
            theme="primary"
            hover="color"
            @click="openSite(row.feedUrl)"
          >
            {{ row.feedUrl }}
          </t-link>
          <span v-else class="text-muted">—</span>
        </template>

        <template #enabled="{ row }">
          <t-switch
            v-if="userStore.hasPermission('rss:update')"
            :value="row.enabled"
            :loading="togglingId === row.id"
            @change="(value: any) => handleToggleEnabled(row, value)"
          />
          <t-tag v-else :theme="row.enabled ? 'success' : 'default'" variant="light-outline">
            {{ row.enabled ? '已启用' : '已停用' }}
          </t-tag>
        </template>

        <template #itemCount="{ row }">
          <span :class="{ 'text-muted': row.itemCount === 0 }">{{ row.itemCount }}</span>
        </template>

        <template #lastFetchedAt="{ row }">
          <span :class="{ 'text-muted': !row.lastFetchedAt }">
            {{ row.lastFetchedAt ? dayjs(row.lastFetchedAt).format('YYYY-MM-DD HH:mm') : '从未抓取' }}
          </span>
        </template>

        <template #op="{ row }">
          <t-space size="small">
            <t-link
              v-if="userStore.hasPermission('rss:refresh')"
              theme="primary"
              hover="color"
              @click="handleRefresh(row)"
            >
              刷新
            </t-link>
            <t-link
              v-if="userStore.hasPermission('rss:update')"
              theme="primary"
              hover="color"
              @click="handleEdit(row)"
            >
              编辑
            </t-link>
            <t-link
              v-if="userStore.hasPermission('rss:delete')"
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

    <t-dialog
      v-model:visible="dialogVisible"
      :header="isEdit ? '编辑订阅源' : '新建订阅源'"
      :confirm-btn="{ loading: submitting }"
      width="520px"
      @confirm="handleSubmit"
    >
      <t-form ref="formRef" :data="formData" :rules="RULES" label-width="80px">
        <t-form-item label="标题" name="title">
          <t-input v-model="formData.title" placeholder="可选，留空则使用站点标题" :maxlength="200" />
        </t-form-item>
        <t-form-item label="站点地址" name="siteUrl">
          <t-input v-model="formData.siteUrl" placeholder="https://example.com" />
        </t-form-item>
        <t-form-item label="订阅地址" name="feedUrl">
          <t-input v-model="formData.feedUrl" placeholder="https://example.com/feed.xml" />
        </t-form-item>
        <t-form-item label="描述" name="description">
          <t-textarea v-model="formData.description" placeholder="可选，订阅源简介" :maxlength="500" :autosize="{ minRows: 2, maxRows: 4 }" />
        </t-form-item>
        <t-form-item label="是否启用" name="enabled">
          <t-switch v-model="formData.enabled" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstanceFunctions, FormRule, PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import dayjs from 'dayjs';
import { computed, onMounted, ref } from 'vue';

import { createRssFeed, deleteRssFeed, getRssFeedList, refreshRssFeed, updateRssFeed } from '@/api/site';
import type { RssFeedResponse } from '@/api/model/types';
import { useUserStore } from '@/store';

defineOptions({ name: 'RssFeedList' });

const userStore = useUserStore();

const list = ref<RssFeedResponse[]>([]);
const loading = ref(false);
const togglingId = ref<number | null>(null);

const dialogVisible = ref(false);
const submitting = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const formRef = ref<FormInstanceFunctions>();
const formData = ref<{
  title: string;
  siteUrl: string;
  feedUrl: string;
  description: string;
  enabled: boolean;
}>({
  title: '',
  siteUrl: '',
  feedUrl: '',
  description: '',
  enabled: true,
});

const RULES: Record<string, FormRule[]> = {
  siteUrl: [{ required: true, message: '请输入站点地址', type: 'error' }],
  feedUrl: [{ required: true, message: '请输入订阅地址', type: 'error' }],
};

const COLUMNS: PrimaryTableCol[] = [
  { colKey: 'title', title: '标题', width: 220 },
  { colKey: 'siteUrl', title: '站点地址', width: 200, ellipsis: true },
  { colKey: 'feedUrl', title: '订阅地址', width: 220, ellipsis: true },
  { colKey: 'enabled', title: '启用状态', width: 100 },
  { colKey: 'itemCount', title: '已抓取', width: 90 },
  { colKey: 'lastFetchedAt', title: '最后抓取', width: 160 },
  { colKey: 'op', title: '操作', width: 160, fixed: 'right' as const },
];

/** 前端分页：RSS 接口返回全量数据 */
const pagination = computed(() => ({
  defaultPageSize: 10,
  total: list.value.length,
  defaultCurrent: currentPage.value,
}));

const currentPage = ref(1);
const pageSize = 10;

function onPageChange(pageInfo: { current: number; pageSize: number }) {
  currentPage.value = pageInfo.current;
}

function openSite(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function fetchList() {
  loading.value = true;
  try {
    list.value = (await getRssFeedList()) ?? [];
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载订阅源失败');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formData.value = { title: '', siteUrl: '', feedUrl: '', description: '', enabled: true };
  formRef.value?.reset();
}

function handleCreate() {
  if (!userStore.hasPermission('rss:create')) return;
  isEdit.value = false;
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function handleEdit(row: RssFeedResponse) {
  isEdit.value = true;
  editingId.value = row.id;
  formData.value = {
    title: row.title ?? '',
    siteUrl: row.siteUrl,
    feedUrl: row.feedUrl,
    description: row.description ?? '',
    enabled: row.enabled,
  };
  dialogVisible.value = true;
}

async function handleSubmit() {
  const result = await formRef.value?.validate();
  if (result !== true) return;

  submitting.value = true;
  try {
    const payload = {
      title: formData.value.title.trim() || undefined,
      siteUrl: formData.value.siteUrl.trim(),
      feedUrl: formData.value.feedUrl.trim(),
      description: formData.value.description.trim() || undefined,
      enabled: formData.value.enabled,
    };

    if (isEdit.value && editingId.value !== null) {
      await updateRssFeed(editingId.value, payload);
      MessagePlugin.success('订阅源已更新');
    } else {
      await createRssFeed(payload);
      MessagePlugin.success('订阅源已创建');
    }
    dialogVisible.value = false;
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

async function handleToggleEnabled(row: RssFeedResponse, val: boolean) {
  togglingId.value = row.id;
  try {
    await updateRssFeed(row.id, {
      title: row.title ?? undefined,
      siteUrl: row.siteUrl,
      feedUrl: row.feedUrl,
      description: row.description ?? undefined,
      enabled: val,
    });
    MessagePlugin.success(val ? '已启用' : '已停用');
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '切换状态失败');
  } finally {
    togglingId.value = null;
  }
}

async function handleRefresh(row: RssFeedResponse) {
  try {
    await refreshRssFeed(row.id);
    MessagePlugin.success('已触发抓取，请稍后刷新查看结果');
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '触发抓取失败');
  }
}

function handleDelete(row: RssFeedResponse) {
  const dialog = DialogPlugin.confirm({
    header: '删除订阅源',
    body: `确定删除订阅源「${row.title || row.siteUrl}」吗？该订阅源下的已抓取条目也会一并删除。`,
    theme: 'warning',
    confirmBtn: { theme: 'danger', content: '删除' },
    onConfirm: async () => {
      try {
        await deleteRssFeed(row.id);
        MessagePlugin.success('订阅源已删除');
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

.title-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  .feed-title {
    font-weight: 500;
    color: var(--td-text-color-primary);
  }

  .error-tag {
    cursor: help;
  }
}

.text-muted {
  color: var(--td-text-color-placeholder);
}
</style>
