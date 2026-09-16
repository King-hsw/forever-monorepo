<template>
  <div class="page-container">
    <t-card :bordered="false" class="page-card">
      <template #title>
        <div class="card-title">
          <span>标签管理</span>
          <span class="card-title__hint">共 {{ list.length }} 个标签</span>
        </div>
      </template>

      <template #actions>
        <t-button v-if="userStore.hasPermission('tag:create')" theme="primary" @click="handleCreate">
          <template #icon><t-icon name="add" /></template>
          新建标签
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
        <template #articleCount="{ row }">
          <span :class="{ 'text-muted': row.articleCount === 0 }">{{ row.articleCount }}</span>
        </template>

        <template #op="{ row }">
          <t-space size="small">
            <t-link v-if="userStore.hasPermission('tag:update')" theme="primary" hover="color" @click="handleEdit(row)">
              编辑
            </t-link>
            <t-link
              v-if="userStore.hasPermission('tag:delete')"
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
      :header="isEdit ? '编辑标签' : '新建标签'"
      :confirm-btn="{ loading: submitting }"
      width="480px"
      @confirm="handleSubmit"
    >
      <t-form ref="formRef" :data="formData" :rules="RULES" label-width="80px">
        <t-form-item label="名称" name="name">
          <t-input v-model="formData.name" placeholder="标签名称，最多 50 字" :maxlength="50" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>
<script setup lang="ts">
import type { FormInstanceFunctions, FormRule, PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';

import { createTag, deleteTag, getTagList, updateTag } from '@/api/content';
import type { TagResponse } from '@/api/model/types';
import { useUserStore } from '@/store';

defineOptions({ name: 'TagList' });

const userStore = useUserStore();

const list = ref<TagResponse[]>([]);
const loading = ref(false);

const dialogVisible = ref(false);
const submitting = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const formRef = ref<FormInstanceFunctions>();
const formData = ref<{ name: string }>({
  name: '',
});

const RULES: Record<string, FormRule[]> = {
  name: [{ required: true, message: '请输入标签名称', type: 'error' }],
};

const COLUMNS: PrimaryTableCol[] = [
  { colKey: 'name', title: '名称', width: 240 },
  { colKey: 'articleCount', title: '文章数', width: 120 },
  { colKey: 'op', title: '操作', width: 140, fixed: 'right' as const },
];

/** 前端分页：标签接口返回全量数据 */
const pagination = computed(() => ({
  defaultPageSize: 10,
  total: list.value.length,
  defaultCurrent: currentPage.value,
}));

const currentPage = ref(1);

function onPageChange(pageInfo: { current: number; pageSize: number }) {
  currentPage.value = pageInfo.current;
}

async function fetchList() {
  loading.value = true;
  try {
    list.value = (await getTagList()) ?? [];
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载标签失败');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formData.value = { name: '' };
  formRef.value?.reset();
}

function handleCreate() {
  isEdit.value = false;
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function handleEdit(row: TagResponse) {
  isEdit.value = true;
  editingId.value = row.id;
  formData.value = { name: row.name };
  dialogVisible.value = true;
}

async function handleSubmit() {
  const result = await formRef.value?.validate();
  if (result !== true) return;

  submitting.value = true;
  try {
    const payload = { name: formData.value.name.trim() };
    if (isEdit.value && editingId.value !== null) {
      await updateTag(editingId.value, payload);
      MessagePlugin.success('标签已更新');
    } else {
      await createTag(payload);
      MessagePlugin.success('标签已创建');
    }
    dialogVisible.value = false;
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

function handleDelete(row: TagResponse) {
  const dialog = DialogPlugin.confirm({
    header: '删除标签',
    body: `确定删除标签「${row.name}」吗？${
      row.articleCount > 0 ? `该标签关联 ${row.articleCount} 篇文章，删除后这些文章的标签将一并移除。` : ''
    }`,
    theme: 'warning',
    confirmBtn: { theme: 'danger', content: '删除' },
    onConfirm: async () => {
      try {
        await deleteTag(row.id);
        MessagePlugin.success('标签已删除');
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
</style>
