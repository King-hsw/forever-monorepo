<template>
  <div class="page-container">
    <t-card :bordered="false" class="page-card">
      <template #title>
        <div class="card-title">
          <span>分类管理</span>
          <span class="card-title__hint">共 {{ list.length }} 个分类</span>
        </div>
      </template>

      <template #actions>
        <t-button v-if="userStore.hasPermission('category:create')" theme="primary" @click="handleCreate">
          <template #icon><t-icon name="add" /></template>
          新建分类
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
        <template #sort="{ row }">
          <t-tag variant="light-outline">{{ row.sort }}</t-tag>
        </template>

        <template #articleCount="{ row }">
          <span :class="{ 'text-muted': row.articleCount === 0 }">{{ row.articleCount }}</span>
        </template>

        <template #op="{ row }">
          <t-space size="small">
            <t-link
              v-if="userStore.hasPermission('category:update')"
              theme="primary"
              hover="color"
              @click="handleEdit(row)"
            >
              编辑
            </t-link>
            <t-link
              v-if="userStore.hasPermission('category:delete')"
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
      :header="isEdit ? '编辑分类' : '新建分类'"
      :confirm-btn="{ loading: submitting }"
      width="480px"
      @confirm="handleSubmit"
    >
      <t-form ref="formRef" :data="formData" :rules="RULES" label-width="80px">
        <t-form-item label="名称" name="name">
          <t-input v-model="formData.name" placeholder="分类名称，最多 50 字" :maxlength="50" />
        </t-form-item>
        <t-form-item label="别名" name="slug">
          <t-input v-model="formData.slug" placeholder="URL 别名，留空则由后端生成" :maxlength="100" />
        </t-form-item>
        <t-form-item label="排序" name="sort">
          <t-input-number v-model="formData.sort" :min="0" :max="9999" theme="column" />
          <span class="form-hint">数值越小越靠前</span>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstanceFunctions, FormRule, PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';

import { createCategory, deleteCategory, getCategoryList, updateCategory } from '@/api/content';
import type { CategoryResponse } from '@/api/model/types';
import { useUserStore } from '@/store';

defineOptions({ name: 'CategoryList' });

const userStore = useUserStore();

const list = ref<CategoryResponse[]>([]);
const loading = ref(false);

const dialogVisible = ref(false);
const submitting = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const formRef = ref<FormInstanceFunctions>();
const formData = ref<{ name: string; slug: string; sort: number }>({
  name: '',
  slug: '',
  sort: 0,
});

const RULES: Record<string, FormRule[]> = {
  name: [{ required: true, message: '请输入分类名称', type: 'error' }],
};

const COLUMNS: PrimaryTableCol[] = [
  { colKey: 'name', title: '名称', width: 200 },
  { colKey: 'slug', title: '别名', width: 200 },
  { colKey: 'sort', title: '排序', width: 100 },
  { colKey: 'articleCount', title: '文章数', width: 100 },
  { colKey: 'op', title: '操作', width: 140, fixed: 'right' as const },
];

/** 前端分页：分类接口返回全量数据 */
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

async function fetchList() {
  loading.value = true;
  try {
    list.value = (await getCategoryList()) ?? [];
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载分类失败');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formData.value = { name: '', slug: '', sort: 0 };
  formRef.value?.reset();
}

function handleCreate() {
  isEdit.value = false;
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function handleEdit(row: CategoryResponse) {
  isEdit.value = true;
  editingId.value = row.id;
  formData.value = { name: row.name, slug: row.slug, sort: row.sort };
  dialogVisible.value = true;
}

async function handleSubmit() {
  const result = await formRef.value?.validate();
  if (result !== true) return;

  submitting.value = true;
  try {
    const payload = {
      name: formData.value.name.trim(),
      slug: formData.value.slug.trim() || undefined,
      sort: formData.value.sort,
    };
    if (isEdit.value && editingId.value !== null) {
      await updateCategory(editingId.value, payload);
      MessagePlugin.success('分类已更新');
    } else {
      await createCategory(payload);
      MessagePlugin.success('分类已创建');
    }
    dialogVisible.value = false;
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

function handleDelete(row: CategoryResponse) {
  const dialog = DialogPlugin.confirm({
    header: '删除分类',
    body: `确定删除分类「${row.name}」吗？${
      row.articleCount > 0 ? `该分类下还有 ${row.articleCount} 篇文章，删除后这些文章将失去分类。` : ''
    }`,
    theme: 'warning',
    confirmBtn: { theme: 'danger', content: '删除' },
    onConfirm: async () => {
      try {
        await deleteCategory(row.id);
        MessagePlugin.success('分类已删除');
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

.text-muted {
  color: var(--td-text-color-placeholder);
}

.form-hint {
  margin-left: 12px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}
</style>
