<template>
  <div class="page-container">
    <t-card :bordered="false" class="page-card">
      <template #title>
        <div class="card-title">
          <span>动态管理</span>
          <span class="card-title__hint">共 {{ total }} 条动态</span>
        </div>
      </template>

      <template #actions>
        <t-button v-if="userStore.hasPermission('moment:post')" theme="primary" @click="handleCreate">
          <template #icon><t-icon name="add" /></template>
          发布动态
        </t-button>
      </template>

      <!-- 加载态 -->
      <t-loading :loading="loading" show-overlay>
        <!-- 空状态 -->
        <t-empty v-if="!loading && list.length === 0" description="暂无动态" />

        <!-- 卡片流 -->
        <div v-else class="moment-list">
          <t-card v-for="item in list" :key="item.id" :bordered="false" class="moment-item">
            <div class="moment-header">
              <t-avatar :image="item.avatarUrl" size="40px">
                {{ item.username.slice(0, 1) }}
              </t-avatar>
              <div class="moment-meta">
                <span class="moment-username">{{ item.username }}</span>
                <span class="moment-time">{{ dayjs(item.createdAt).format('YYYY-MM-DD HH:mm') }}</span>
              </div>
              <t-link
                v-if="item.canDelete && userStore.hasPermission('moment:post')"
                theme="danger"
                hover="color"
                class="moment-op"
                @click="handleDelete(item)"
              >
                删除
              </t-link>
            </div>

            <p v-if="item.content" class="moment-content">{{ item.content }}</p>

            <div v-if="item.media.images.length" class="moment-images">
              <t-image
                v-for="(img, idx) in item.media.images"
                :key="idx"
                :src="img"
                :preview="true"
                fit="cover"
                class="moment-image"
              />
            </div>

            <div class="moment-footer">
              <span v-if="item.location" class="moment-location">
                <t-icon name="location" />
                {{ item.location }}
              </span>
              <span class="moment-comment">
                <t-icon name="chat" />
                {{ item.commentCount }} 条评论
              </span>
            </div>
          </t-card>
        </div>
      </t-loading>

      <!-- 服务端分页 -->
      <div v-if="total > pageSize" class="moment-pagination">
        <t-pagination :current="currentPage" :page-size="pageSize" :total="total" show-jumper @change="onPageChange" />
      </div>
    </t-card>

    <!-- 发布动态弹窗 -->
    <t-dialog
      v-model:visible="dialogVisible"
      header="发布动态"
      :confirm-btn="{ loading: submitting, content: '发布' }"
      width="560px"
      @confirm="handleSubmit"
      @close="resetForm"
    >
      <t-form ref="formRef" :data="formData" :rules="RULES" label-width="72px">
        <t-form-item label="内容" name="content">
          <t-textarea
            v-model="formData.content"
            placeholder="说点什么吧（最多 1000 字）"
            :maxlength="1000"
            :autosize="{ minRows: 3, maxRows: 8 }"
            show-limit-number
          />
        </t-form-item>
        <t-form-item label="位置" name="location">
          <t-input v-model="formData.location" placeholder="所在位置，选填" :maxlength="100" />
        </t-form-item>
        <t-form-item label="图片" name="images">
          <t-textarea
            v-model="imageText"
            placeholder="每行粘贴一个图片地址，最多 9 张，选填"
            :autosize="{ minRows: 3, maxRows: 8 }"
          />
          <span class="form-hint">已录入 {{ imageCount }} / 9 张</span>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>
<script setup lang="ts">
import dayjs from 'dayjs';
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';

import { createMoment, deleteMoment, getPublicMoments } from '@/api/interaction';
import type { MomentCreateRequest, MomentResponse } from '@/api/model/types';
import { useUserStore } from '@/store';

defineOptions({ name: 'MomentList' });

const userStore = useUserStore();

const list = ref<MomentResponse[]>([]);
const total = ref(0);
const loading = ref(false);

const currentPage = ref(1);
const pageSize = ref(10);

const dialogVisible = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstanceFunctions>();

const formData = ref<{ content: string; location: string }>({
  content: '',
  location: '',
});
const imageText = ref('');

/** 按换行拆分图片地址，过滤空行，最多 9 张 */
const imageCount = computed(() => buildImages().length);

function buildImages(): string[] {
  return imageText.value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 9);
}

const RULES: Record<string, FormRule[]> = {
  content: [{ required: true, message: '请输入动态内容', type: 'error' }],
};

async function fetchList() {
  loading.value = true;
  try {
    const res = await getPublicMoments({ page: currentPage.value, size: pageSize.value });
    list.value = res?.list ?? [];
    total.value = res?.total ?? 0;
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载动态失败');
  } finally {
    loading.value = false;
  }
}

function onPageChange(pageInfo: { current: number; pageSize: number }) {
  currentPage.value = pageInfo.current;
  pageSize.value = pageInfo.pageSize;
  fetchList();
}

function handleCreate() {
  resetForm();
  dialogVisible.value = true;
}

function resetForm() {
  formData.value = { content: '', location: '' };
  imageText.value = '';
}

async function handleSubmit() {
  const result = await formRef.value?.validate();
  if (result !== true) return;

  // 内容与图片至少填一项（图片仅当非空时提交）
  const images = buildImages();
  if (!formData.value.content.trim() && images.length === 0) {
    MessagePlugin.error('请填写动态内容或至少一张图片');
    return;
  }

  const payload: MomentCreateRequest = {
    content: formData.value.content.trim() || undefined,
    images: images.length ? images : undefined,
    location: formData.value.location.trim() || undefined,
  };

  submitting.value = true;
  try {
    await createMoment(payload);
    MessagePlugin.success('动态已发布');
    dialogVisible.value = false;
    resetForm();
    currentPage.value = 1;
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '发布失败');
  } finally {
    submitting.value = false;
  }
}

function handleDelete(row: MomentResponse) {
  const dialog = DialogPlugin.confirm({
    header: '删除动态',
    body: `确定删除「${row.username}」的这条动态吗？此操作不可恢复。`,
    theme: 'warning',
    confirmBtn: { theme: 'danger', content: '删除' },
    onConfirm: async () => {
      try {
        await deleteMoment(row.id);
        MessagePlugin.success('动态已删除');
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

.moment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.moment-item {
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-component-stroke);
}

.moment-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.moment-meta {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.moment-username {
  font-size: 14px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.moment-time {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.moment-op {
  flex-shrink: 0;
}

.moment-content {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--td-text-color-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.moment-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.moment-image {
  width: 100%;
  height: 120px;
  border-radius: 6px;
  overflow: hidden;
}

.moment-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--td-text-color-placeholder);

  .moment-location,
  .moment-comment {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
}

.moment-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.form-hint {
  margin-left: 12px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}
</style>
