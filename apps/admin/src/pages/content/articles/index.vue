<template>
  <div class="page-container">
    <t-card :bordered="false" class="page-card">
      <template #title>
        <span>文章管理</span>
      </template>

      <template #actions>
        <t-button v-if="can('article:create')" theme="primary" @click="router.push('/content/articles/new')">
          <template #icon><t-icon name="add" /></template>
          写文章
        </t-button>
      </template>

      <div class="filter-bar">
        <t-input
          v-model="query.keyword"
          placeholder="搜索标题"
          clearable
          class="filter-bar__input"
          @enter="handleSearch"
          @clear="handleSearch"
        />
        <t-select
          v-model="query.status"
          :options="STATUS_OPTIONS"
          placeholder="全部状态"
          clearable
          class="filter-bar__select"
          @change="handleSearch"
        />
        <t-select
          v-model="query.categoryId"
          :options="categoryOptions"
          placeholder="全部分类"
          clearable
          class="filter-bar__select"
          @change="handleSearch"
        />
        <t-button theme="default" variant="outline" @click="handleReset">重置</t-button>
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
        <template #title="{ row }">
          <div class="cell-title">
            <span class="cell-title__text">{{ row.title }}</span>
            <span class="cell-title__slug">/{{ row.slug }}</span>
          </div>
        </template>

        <template #categoryName="{ row }">
          <span v-if="row.categoryName">{{ row.categoryName }}</span>
          <span v-else class="text-muted">未分类</span>
        </template>

        <template #tags="{ row }">
          <t-space v-if="row.tags && row.tags.length" size="small" break-line>
            <t-tag v-for="tag in row.tags" :key="tag.id" variant="light" size="small">{{ tag.name }}</t-tag>
          </t-space>
          <span v-else class="text-muted">-</span>
        </template>

        <template #status="{ row }">
          <t-tag :theme="row.status === 'PUBLISHED' ? 'success' : 'warning'" variant="light">
            {{ row.status === 'PUBLISHED' ? '已发布' : '草稿' }}
          </t-tag>
        </template>

        <template #viewCount="{ row }">
          <span class="text-muted">{{ row.viewCount }}</span>
        </template>

        <template #publishedAt="{ row }">
          <span class="text-muted">{{ row.publishedAt ? formatTime(row.publishedAt) : '-' }}</span>
        </template>

        <template #op="{ row }">
          <t-space size="small">
            <t-link v-if="can('article:update')" theme="primary" hover="color" @click="handleEdit(row)">编辑</t-link>
            <t-link v-if="can('article:publish')" theme="primary" hover="color" @click="handleTogglePublish(row)">
              {{ row.status === 'PUBLISHED' ? '下线' : '发布' }}
            </t-link>
            <t-link v-if="can('article:ai-summary')" theme="default" hover="color" @click="handleAiSummary(row)">
              AI 概要
            </t-link>
            <t-link v-if="can('article:delete')" theme="danger" hover="color" @click="handleDelete(row)">删除</t-link>
          </t-space>
        </template>
      </t-table>
    </t-card>
  </div>
</template>
<script setup lang="ts">
import dayjs from 'dayjs';
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  deleteArticle,
  generateArticleAiSummary,
  getArticleList,
  getCategoryList,
  publishArticle,
  unpublishArticle,
} from '@/api/content';
import type { AdminArticleQuery, ArticleResponse, ArticleStatus, CategoryResponse } from '@/api/model/types';
import { useUserStore } from '@/store';

defineOptions({ name: 'ArticleList' });

const router = useRouter();
const userStore = useUserStore();
const can = (code: string) => userStore.hasPermission(code);

const list = ref<ArticleResponse[]>([]);
const loading = ref(false);
const total = ref(0);

const query = ref<AdminArticleQuery>({
  page: 1,
  size: 10,
  keyword: '',
  status: undefined,
  categoryId: undefined,
});

const STATUS_OPTIONS = [
  { label: '已发布', value: 'PUBLISHED' as ArticleStatus },
  { label: '草稿', value: 'DRAFT' as ArticleStatus },
];

const categoryOptions = ref<{ label: string; value: number }[]>([]);

const COLUMNS: PrimaryTableCol[] = [
  { colKey: 'title', title: '标题', minWidth: 260 },
  { colKey: 'categoryName', title: '分类', width: 120 },
  { colKey: 'tags', title: '标签', minWidth: 160 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'viewCount', title: '浏览', width: 80 },
  { colKey: 'publishedAt', title: '发布时间', width: 160 },
  { colKey: 'op', title: '操作', width: 230, fixed: 'right' as const },
];

const pagination = computed(() => ({
  defaultPageSize: query.value.size,
  total: total.value,
  defaultCurrent: query.value.page,
}));

function formatTime(value: string) {
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

async function fetchList() {
  loading.value = true;
  try {
    const res = await getArticleList(query.value);
    list.value = res?.list ?? [];
    total.value = res?.total ?? 0;
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载文章失败');
  } finally {
    loading.value = false;
  }
}

async function fetchCategories() {
  try {
    const categories = (await getCategoryList()) ?? [];
    categoryOptions.value = categories.map((item: CategoryResponse) => ({ label: item.name, value: item.id }));
  } catch {
    // 分类拉取失败不影响文章列表本身，筛选框留空即可
  }
}

function handleSearch() {
  query.value.page = 1;
  fetchList();
}

function handleReset() {
  query.value = { page: 1, size: 10, keyword: '', status: undefined, categoryId: undefined };
  fetchList();
}

function onPageChange(pageInfo: { current: number; pageSize: number }) {
  query.value.page = pageInfo.current;
  query.value.size = pageInfo.pageSize;
  fetchList();
}

function handleEdit(row: ArticleResponse) {
  router.push(`/content/articles/${row.id}/edit`);
}

async function handleTogglePublish(row: ArticleResponse) {
  const isPublished = row.status === 'PUBLISHED';
  loading.value = true;
  try {
    if (isPublished) await unpublishArticle(row.id);
    else await publishArticle(row.id);
    MessagePlugin.success(isPublished ? '文章已下线' : '文章已发布');
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '操作失败');
  } finally {
    loading.value = false;
  }
}

async function handleAiSummary(row: ArticleResponse) {
  loading.value = true;
  try {
    await generateArticleAiSummary(row.id);
    MessagePlugin.success('AI 概要已生成');
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '生成失败，请确认后端已配置 AI Key');
  } finally {
    loading.value = false;
  }
}

function handleDelete(row: ArticleResponse) {
  const dialog = DialogPlugin.confirm({
    header: '删除文章',
    body: `确定删除文章「${row.title}」吗？该操作不可恢复。`,
    theme: 'warning',
    confirmBtn: { theme: 'danger', content: '删除' },
    onConfirm: async () => {
      try {
        await deleteArticle(row.id);
        MessagePlugin.success('文章已删除');
        dialog.hide();
        await fetchList();
      } catch (error) {
        MessagePlugin.error((error as Error).message || '删除失败');
      }
    },
  });
}

onMounted(() => {
  fetchList();
  fetchCategories();
});
</script>
<style lang="less" scoped>
.page-container {
  padding: 16px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;

  &__input {
    width: 240px;
  }

  &__select {
    width: 150px;
  }
}

.cell-title {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__text {
    color: var(--td-text-color-primary);
  }

  &__slug {
    font-size: 12px;
    color: var(--td-text-color-placeholder);
  }
}

.text-muted {
  color: var(--td-text-color-placeholder);
}
</style>
