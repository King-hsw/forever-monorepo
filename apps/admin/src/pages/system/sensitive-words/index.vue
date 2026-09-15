<template>
  <div class="page-container">
    <t-card :bordered="false" class="page-card">
      <template #title>
        <div class="card-title">
          <span>敏感词管理</span>
          <span class="card-title__hint">共 {{ list.length }} 个敏感词</span>
        </div>
      </template>

      <template #actions>
        <t-button v-if="userStore.hasPermission('sensitive:create')" theme="primary" @click="handleCreate">
          <template #icon><t-icon name="add" /></template>
          新建敏感词
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
        <template #createdAt="{ row }">
          <span>{{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}</span>
        </template>

        <template #op="{ row }">
          <t-space size="small">
            <t-link
              v-if="userStore.hasPermission('sensitive:update')"
              theme="primary"
              hover="color"
              @click="handleEdit(row)"
            >
              编辑
            </t-link>
            <t-link
              v-if="userStore.hasPermission('sensitive:delete')"
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
      :header="isEdit ? '编辑敏感词' : '新建敏感词'"
      :confirm-btn="{ loading: submitting }"
      width="480px"
      @confirm="handleSubmit"
    >
      <t-form ref="formRef" :data="formData" :rules="RULES" label-width="80px" @submit="handleSubmit">
        <t-form-item label="敏感词" name="word">
          <t-input v-model="formData.word" placeholder="敏感词内容，最多 100 字" :maxlength="100" />
        </t-form-item>
        <t-form-item label="替换词" name="replacement">
          <t-input v-model="formData.replacement" placeholder="留空则默认替换为 ***，最多 100 字" :maxlength="100" />
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

import {
  createSensitiveWord,
  deleteSensitiveWord,
  getSensitiveWordList,
  updateSensitiveWord,
} from '@/api/site';
import type { SensitiveWordResponse } from '@/api/model/types';
import { useUserStore } from '@/store';

defineOptions({ name: 'SensitiveWordList' });

const userStore = useUserStore();

const list = ref<SensitiveWordResponse[]>([]);
const loading = ref(false);

const dialogVisible = ref(false);
const submitting = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const formRef = ref<FormInstanceFunctions>();
const formData = ref<{ word: string; replacement: string }>({
  word: '',
  replacement: '',
});

const RULES: Record<string, FormRule[]> = {
  word: [{ required: true, message: '请输入敏感词', type: 'error' }],
};

const COLUMNS: PrimaryTableCol[] = [
  { colKey: 'word', title: '敏感词', width: 240 },
  { colKey: 'replacement', title: '替换词', width: 200 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
  { colKey: 'op', title: '操作', width: 140, fixed: 'right' as const },
];

/** 前端分页：敏感词接口返回全量数据 */
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
    list.value = (await getSensitiveWordList()) ?? [];
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载敏感词失败');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formData.value = { word: '', replacement: '' };
  formRef.value?.reset();
}

function handleCreate() {
  isEdit.value = false;
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function handleEdit(row: SensitiveWordResponse) {
  isEdit.value = true;
  editingId.value = row.id;
  formData.value = { word: row.word, replacement: row.replacement };
  dialogVisible.value = true;
}

async function handleSubmit() {
  const result = await formRef.value?.validate();
  if (result !== true) return;

  submitting.value = true;
  try {
    // 替换词留空时由后端默认置为 ***
    const payload = {
      word: formData.value.word.trim(),
      replacement: formData.value.replacement.trim() || undefined,
    };
    if (isEdit.value && editingId.value !== null) {
      await updateSensitiveWord(editingId.value, payload);
      MessagePlugin.success('敏感词已更新');
    } else {
      await createSensitiveWord(payload);
      MessagePlugin.success('敏感词已创建');
    }
    dialogVisible.value = false;
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

function handleDelete(row: SensitiveWordResponse) {
  const dialog = DialogPlugin.confirm({
    header: '删除敏感词',
    body: `确定删除敏感词「${row.word}」吗？删除后相关内容将不再被替换。`,
    theme: 'warning',
    confirmBtn: { theme: 'danger', content: '删除' },
    onConfirm: async () => {
      try {
        await deleteSensitiveWord(row.id);
        MessagePlugin.success('敏感词已删除');
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
</style>
