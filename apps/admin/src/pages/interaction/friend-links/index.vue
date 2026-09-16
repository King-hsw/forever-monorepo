<template>
  <div class="page-container">
    <t-card :bordered="false" class="page-card">
      <template #title>
        <div class="card-title">
          <span>友情链接管理</span>
          <span class="card-title__hint">共 {{ list.length }} 条申请</span>
        </div>
      </template>

      <template #actions>
        <t-button v-if="userStore.hasPermission('friend-link:create')" theme="primary" @click="handleCreate">
          <template #icon><t-icon name="add" /></template>
          新建友链
        </t-button>
      </template>

      <div class="filter-bar">
        <t-radio-group v-model="statusFilter" variant="default-filled" @change="onFilterChange">
          <t-radio-button value="ALL">全部</t-radio-button>
          <t-radio-button value="PENDING">待审核</t-radio-button>
          <t-radio-button value="APPROVED">已通过</t-radio-button>
          <t-radio-button value="REJECTED">已驳回</t-radio-button>
        </t-radio-group>
      </div>

      <t-table
        row-key="id"
        :data="filteredList"
        :columns="COLUMNS"
        :loading="loading"
        :hover="true"
        :pagination="pagination"
        @page-change="onPageChange"
      >
        <template #name="{ row }">
          <t-space align="center" size="small">
            <t-avatar v-if="row.iconUrl" :image="row.iconUrl" size="small" />
            <t-avatar v-else size="small">{{ row.name.charAt(0) }}</t-avatar>
            <span class="link-name">{{ row.name }}</span>
          </t-space>
        </template>

        <template #siteUrl="{ row }">
          <t-link v-if="row.siteUrl" theme="primary" hover="color" @click="openSite(row.siteUrl)">
            {{ row.siteUrl }}
          </t-link>
          <span v-else class="text-muted">—</span>
        </template>

        <template #description="{ row }">
          <span :class="{ 'text-muted': !row.description }">{{ row.description || '暂无描述' }}</span>
        </template>

        <template #contact="{ row }">
          <span :class="{ 'text-muted': !row.contact }">{{ row.contact || '—' }}</span>
        </template>

        <template #status="{ row }">
          <t-tag :theme="statusMeta(row.status).theme" variant="light-outline">
            {{ statusMeta(row.status).text }}
          </t-tag>
        </template>

        <template #createdAt="{ row }">
          <span :class="{ 'text-muted': !row.createdAt }">
            {{ row.createdAt ? dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') : '—' }}
          </span>
        </template>

        <template #op="{ row }">
          <t-space size="small">
            <t-link
              v-if="row.status === 'PENDING' && userStore.hasPermission('friend-link:approve')"
              theme="success"
              hover="color"
              @click="handleApprove(row)"
            >
              通过
            </t-link>
            <t-link
              v-if="row.status === 'PENDING' && userStore.hasPermission('friend-link:reject')"
              theme="warning"
              hover="color"
              @click="handleRejectClick(row)"
            >
              驳回
            </t-link>
            <t-link
              v-if="userStore.hasPermission('friend-link:update')"
              theme="primary"
              hover="color"
              @click="handleEdit(row)"
            >
              编辑
            </t-link>
            <t-link
              v-if="userStore.hasPermission('friend-link:delete')"
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

    <!-- 新建 / 编辑 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="isEdit ? '编辑友链' : '新建友链'"
      :confirm-btn="{ loading: submitting }"
      width="520px"
      @confirm="handleSubmit"
    >
      <t-form ref="formRef" :data="formData" :rules="RULES" label-width="80px">
        <t-form-item label="名称" name="name">
          <t-input v-model="formData.name" placeholder="站点名称，最多 100 字" :maxlength="100" />
        </t-form-item>
        <t-form-item label="站点地址" name="siteUrl">
          <t-input v-model="formData.siteUrl" placeholder="https://example.com" />
        </t-form-item>
        <t-form-item label="图标地址" name="iconUrl">
          <t-input v-model="formData.iconUrl" placeholder="可选，站点 favicon 地址" :maxlength="500" />
        </t-form-item>
        <t-form-item label="描述" name="description">
          <t-textarea
            v-model="formData.description"
            placeholder="可选，站点简介"
            :maxlength="200"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
        </t-form-item>
        <t-form-item v-if="!isEdit" label="联系方式" name="contact">
          <t-input v-model="formData.contact" placeholder="可选，申请人邮箱或网址" :maxlength="200" />
        </t-form-item>
        <t-form-item v-if="isEdit" label="状态" name="status">
          <t-select v-model="formData.status" :options="STATUS_OPTIONS" />
        </t-form-item>
        <t-form-item v-if="isEdit && formData.status === 'REJECTED'" label="驳回原因" name="rejectReason">
          <t-textarea
            v-model="formData.rejectReason"
            placeholder="可选，驳回理由"
            :maxlength="200"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 驳回原因 -->
    <t-dialog
      v-model:visible="rejectDialogVisible"
      header="驳回友链"
      :confirm-btn="{ loading: rejecting, content: '确定驳回' }"
      width="480px"
      @confirm="handleRejectConfirm"
    >
      <p class="reject-tip">即将驳回「{{ rejectingName }}」，可填写驳回原因（也可留空）：</p>
      <t-textarea
        v-model="rejectReason"
        placeholder="可选，驳回原因"
        :maxlength="200"
        :autosize="{ minRows: 2, maxRows: 4 }"
      />
    </t-dialog>
  </div>
</template>
<script setup lang="ts">
import dayjs from 'dayjs';
import type { FormInstanceFunctions, FormRule, PrimaryTableCol, SelectOption } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';

import type { FriendLinkResponse, FriendLinkStatus } from '@/api/model/types';
import {
  approveFriendLink,
  createFriendLink,
  deleteFriendLink,
  getFriendLinkList,
  rejectFriendLink,
  updateFriendLink,
} from '@/api/site';
import { useUserStore } from '@/store';

defineOptions({ name: 'FriendLinkList' });

const userStore = useUserStore();

const list = ref<FriendLinkResponse[]>([]);
const loading = ref(false);

const statusFilter = ref<'ALL' | FriendLinkStatus>('ALL');

/** 前端按状态过滤：友链接口返回全量数据 */
const filteredList = computed(() =>
  statusFilter.value === 'ALL' ? list.value : list.value.filter((item) => item.status === statusFilter.value),
);

const dialogVisible = ref(false);
const submitting = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const formRef = ref<FormInstanceFunctions>();
const formData = ref<{
  name: string;
  siteUrl: string;
  iconUrl: string;
  description: string;
  contact: string;
  status: FriendLinkStatus;
  rejectReason: string;
}>({
  name: '',
  siteUrl: '',
  iconUrl: '',
  description: '',
  contact: '',
  status: 'PENDING',
  rejectReason: '',
});

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'PENDING', label: '待审核' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已驳回' },
];

const RULES: Record<string, FormRule[]> = {
  name: [{ required: true, message: '请输入站点名称', type: 'error' }],
  siteUrl: [{ required: true, message: '请输入站点地址', type: 'error' }],
};

const COLUMNS: PrimaryTableCol[] = [
  { colKey: 'name', title: '名称', width: 220 },
  { colKey: 'siteUrl', title: '站点地址', width: 220, ellipsis: true },
  { colKey: 'description', title: '描述', minWidth: 160, ellipsis: true },
  { colKey: 'contact', title: '联系方式', width: 140, ellipsis: true },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'createdAt', title: '提交时间', width: 160 },
  { colKey: 'op', title: '操作', width: 180, fixed: 'right' as const },
];

/** 前端分页：友链接口返回全量数据 */
const pagination = computed(() => ({
  defaultPageSize: 10,
  total: filteredList.value.length,
  defaultCurrent: currentPage.value,
}));

const currentPage = ref(1);

function onFilterChange() {
  currentPage.value = 1;
}

function onPageChange(pageInfo: { current: number; pageSize: number }) {
  currentPage.value = pageInfo.current;
}

function statusMeta(status: FriendLinkStatus): { theme: 'warning' | 'success' | 'danger'; text: string } {
  switch (status) {
    case 'APPROVED':
      return { theme: 'success', text: '已通过' };
    case 'REJECTED':
      return { theme: 'danger', text: '已驳回' };
    case 'PENDING':
    default:
      return { theme: 'warning', text: '待审核' };
  }
}

function openSite(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function fetchList() {
  loading.value = true;
  try {
    list.value = (await getFriendLinkList()) ?? [];
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载友链失败');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formData.value = {
    name: '',
    siteUrl: '',
    iconUrl: '',
    description: '',
    contact: '',
    status: 'PENDING',
    rejectReason: '',
  };
  formRef.value?.reset();
}

function handleCreate() {
  if (!userStore.hasPermission('friend-link:create')) return;
  isEdit.value = false;
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function handleEdit(row: FriendLinkResponse) {
  isEdit.value = true;
  editingId.value = row.id;
  formData.value = {
    name: row.name,
    siteUrl: row.siteUrl,
    iconUrl: row.iconUrl ?? '',
    description: row.description ?? '',
    contact: row.contact ?? '',
    status: row.status,
    rejectReason: row.rejectReason ?? '',
  };
  dialogVisible.value = true;
}

async function handleSubmit() {
  const result = await formRef.value?.validate();
  if (result !== true) return;

  submitting.value = true;
  try {
    const name = formData.value.name.trim();
    const siteUrl = formData.value.siteUrl.trim();
    const iconUrl = formData.value.iconUrl.trim() || undefined;
    const description = formData.value.description.trim() || undefined;

    if (isEdit.value && editingId.value !== null) {
      // PUT 全量覆盖：name/siteUrl/iconUrl/description/status 必须全部回填
      const payload = {
        name,
        siteUrl,
        iconUrl,
        description,
        status: formData.value.status,
        rejectReason:
          formData.value.status === 'REJECTED' ? formData.value.rejectReason.trim() || undefined : undefined,
      };
      await updateFriendLink(editingId.value, payload);
      MessagePlugin.success('友链已更新');
    } else {
      const payload = {
        name,
        siteUrl,
        iconUrl,
        description,
        contact: formData.value.contact.trim() || undefined,
      };
      await createFriendLink(payload);
      MessagePlugin.success('友链已创建');
    }
    dialogVisible.value = false;
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

function handleApprove(row: FriendLinkResponse) {
  const dialog = DialogPlugin.confirm({
    header: '通过友链',
    body: `确定通过「${row.name}」的友链申请吗？`,
    theme: 'warning',
    confirmBtn: { theme: 'success', content: '通过' },
    onConfirm: async () => {
      try {
        await approveFriendLink(row.id);
        MessagePlugin.success('已通过');
        dialog.hide();
        await fetchList();
      } catch (error) {
        MessagePlugin.error((error as Error).message || '操作失败');
      }
    },
  });
}

const rejectDialogVisible = ref(false);
const rejecting = ref(false);
const rejectingId = ref<number | null>(null);
const rejectingName = ref('');
const rejectReason = ref('');

function handleRejectClick(row: FriendLinkResponse) {
  rejectingId.value = row.id;
  rejectingName.value = row.name;
  rejectReason.value = '';
  rejectDialogVisible.value = true;
}

async function handleRejectConfirm() {
  if (rejectingId.value === null) return;
  rejecting.value = true;
  try {
    await rejectFriendLink(rejectingId.value, rejectReason.value.trim() || undefined);
    MessagePlugin.success('已驳回');
    rejectDialogVisible.value = false;
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '操作失败');
  } finally {
    rejecting.value = false;
  }
}

function handleDelete(row: FriendLinkResponse) {
  const dialog = DialogPlugin.confirm({
    header: '删除友链',
    body: `确定删除友链「${row.name}」吗？此操作不可恢复。`,
    theme: 'warning',
    confirmBtn: { theme: 'danger', content: '删除' },
    onConfirm: async () => {
      try {
        await deleteFriendLink(row.id);
        MessagePlugin.success('友链已删除');
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

.filter-bar {
  margin-bottom: 16px;
}

.link-name {
  font-weight: 500;
  color: var(--td-text-color-primary);
}

.text-muted {
  color: var(--td-text-color-placeholder);
}

.reject-tip {
  margin: 0 0 12px;
  color: var(--td-text-color-secondary);
}
</style>
