<template>
  <div class="page-container">
    <t-card :bordered="false" class="page-card">
      <template #title>
        <div class="card-title">
          <span>用户管理</span>
          <span class="card-title__hint">共 {{ list.length }} 个用户</span>
        </div>
      </template>

      <template #actions>
        <t-button v-if="userStore.hasPermission('rbac:user:create')" theme="primary" @click="handleCreate">
          <template #icon><t-icon name="add" /></template>
          新建用户
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
        <template #nickname="{ row }">
          <span :class="{ 'text-muted': !row.nickname }">{{ row.nickname || '-' }}</span>
        </template>

        <template #status="{ row }">
          <t-tag v-if="row.status === 'ACTIVE'" theme="success" variant="light-outline">启用</t-tag>
          <t-tag v-else theme="default" variant="light-outline">停用</t-tag>
        </template>

        <template #roles="{ row }">
          <t-space v-if="row.roles && row.roles.length" size="small" break-line>
            <t-tag v-for="role in row.roles" :key="role.id" variant="light-outline">{{ role.name }}</t-tag>
          </t-space>
          <span v-else class="text-muted">-</span>
        </template>

        <template #createdAt="{ row }">
          <span>{{ formatTime(row.createdAt) }}</span>
        </template>

        <template #op="{ row }">
          <t-space size="small">
            <t-link
              v-if="userStore.hasPermission('rbac:user:status')"
              :theme="row.status === 'ACTIVE' ? 'warning' : 'success'"
              hover="color"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 'ACTIVE' ? '停用' : '启用' }}
            </t-link>
            <t-link
              v-if="userStore.hasPermission('rbac:user:password')"
              theme="primary"
              hover="color"
              @click="handleResetPassword(row)"
            >
              重置密码
            </t-link>
            <t-link
              v-if="userStore.hasPermission('rbac:user:roles')"
              theme="primary"
              hover="color"
              @click="handleAssignRoles(row)"
            >
              分配角色
            </t-link>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 新建用户弹窗 -->
    <t-dialog
      v-model:visible="createVisible"
      header="新建用户"
      :confirm-btn="{ loading: submitting }"
      width="520px"
      @confirm="handleCreateSubmit"
    >
      <t-form
        ref="createFormRef"
        :data="createForm"
        :rules="CREATE_RULES"
        label-width="80px"
        @submit="handleCreateSubmit"
      >
        <t-form-item label="用户名" name="username">
          <t-input v-model="createForm.username" placeholder="登录用户名，最多 50 字符" :maxlength="50" />
        </t-form-item>
        <t-form-item label="密码" name="password">
          <t-input v-model="createForm.password" type="password" placeholder="6–100 字符" :maxlength="100" />
        </t-form-item>
        <t-form-item label="昵称" name="nickname">
          <t-input v-model="createForm.nickname" placeholder="昵称，最多 50 字符，可留空" :maxlength="50" />
        </t-form-item>
        <t-form-item label="初始角色" name="roleIds">
          <t-select v-model="createForm.roleIds" multiple placeholder="请选择初始角色" :options="roleOptions" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 重置密码弹窗 -->
    <t-dialog
      v-model:visible="resetVisible"
      header="重置密码"
      :confirm-btn="{ loading: resetSubmitting }"
      width="480px"
      @confirm="handleResetSubmit"
    >
      <t-form ref="resetFormRef" :data="resetForm" :rules="RESET_RULES" label-width="80px" @submit="handleResetSubmit">
        <t-form-item label="新密码" name="password">
          <t-input
            v-model="resetForm.password"
            type="password"
            placeholder="请输入新密码，6–100 字符"
            :maxlength="100"
          />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 分配角色弹窗 -->
    <t-dialog
      v-model:visible="roleVisible"
      header="分配角色"
      :confirm-btn="{ loading: roleSubmitting }"
      width="480px"
      @confirm="handleRoleSubmit"
    >
      <t-checkbox-group v-model="assignRoleIds" :options="roleOptions" />
    </t-dialog>
  </div>
</template>
<script setup lang="ts">
import dayjs from 'dayjs';
import type { FormInstanceFunctions, FormRule, PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';

import type { SysRole, UserView } from '@/api/model/types';
import {
  createUser,
  getRoleList,
  getUserList,
  resetUserPassword,
  updateUserRoles,
  updateUserStatus,
} from '@/api/system';
import { useUserStore } from '@/store';

defineOptions({ name: 'UserList' });

const userStore = useUserStore();

const list = ref<UserView[]>([]);
const loading = ref(false);

/* 角色选项（新建 / 分配角色共用） */
const roles = ref<SysRole[]>([]);
const roleOptions = computed(() => roles.value.map((r) => ({ label: r.name, value: r.id })));

/* 新建用户弹窗 */
const createVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstanceFunctions>();
const createForm = ref<{ username: string; password: string; nickname: string; roleIds: number[] }>({
  username: '',
  password: '',
  nickname: '',
  roleIds: [],
});

/* 重置密码弹窗 */
const resetVisible = ref(false);
const resetSubmitting = ref(false);
const resetFormRef = ref<FormInstanceFunctions>();
const resetForm = ref<{ password: string }>({ password: '' });
const resetId = ref<number | null>(null);

/* 分配角色弹窗 */
const roleVisible = ref(false);
const roleSubmitting = ref(false);
const assignRoleIds = ref<number[]>([]);
const assignId = ref<number | null>(null);

const CREATE_RULES: Record<string, FormRule[]> = {
  username: [{ required: true, message: '请输入用户名', type: 'error' }],
  password: [
    { required: true, message: '请输入密码', type: 'error' },
    {
      validator: (val: unknown) => (typeof val === 'string' ? val.length >= 6 && val.length <= 100 : false),
      message: '密码长度需为 6–100 字符',
      type: 'error',
    },
  ],
};

const RESET_RULES: Record<string, FormRule[]> = {
  password: [
    { required: true, message: '请输入新密码', type: 'error' },
    {
      validator: (val: unknown) => (typeof val === 'string' ? val.length >= 6 && val.length <= 100 : false),
      message: '密码长度需为 6–100 字符',
      type: 'error',
    },
  ],
};

const COLUMNS: PrimaryTableCol[] = [
  { colKey: 'username', title: '用户名', width: 160 },
  { colKey: 'nickname', title: '昵称', width: 160 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'roles', title: '角色', minWidth: 180 },
  { colKey: 'createdAt', title: '创建时间', width: 160 },
  { colKey: 'op', title: '操作', width: 200, fixed: 'right' as const },
];

/** 用户接口返回全量数组，前端分页 */
const currentPage = ref(1);
const pageSize = 10;
const pagination = computed(() => ({
  defaultPageSize: pageSize,
  total: list.value.length,
  defaultCurrent: currentPage.value,
}));

function onPageChange(pageInfo: { current: number; pageSize: number }) {
  currentPage.value = pageInfo.current;
}

function formatTime(value?: string) {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

async function fetchList() {
  loading.value = true;
  try {
    list.value = (await getUserList()) ?? [];
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载用户失败');
  } finally {
    loading.value = false;
  }
}

async function fetchRoles() {
  try {
    roles.value = (await getRoleList()) ?? [];
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载角色失败');
  }
}

function resetCreateForm() {
  createForm.value = { username: '', password: '', nickname: '', roleIds: [] };
  createFormRef.value?.reset();
}

function handleCreate() {
  resetCreateForm();
  createVisible.value = true;
}

async function handleCreateSubmit() {
  const result = await createFormRef.value?.validate();
  if (result !== true) return;

  submitting.value = true;
  try {
    const payload = {
      username: createForm.value.username.trim(),
      password: createForm.value.password,
      nickname: createForm.value.nickname.trim() || undefined,
      roleIds: createForm.value.roleIds,
    };
    await createUser(payload);
    MessagePlugin.success('用户已创建');
    createVisible.value = false;
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '创建失败');
  } finally {
    submitting.value = false;
  }
}

function handleToggleStatus(row: UserView) {
  const next = row.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
  const dialog = DialogPlugin.confirm({
    header: next === 'ACTIVE' ? '启用用户' : '停用用户',
    body: `确定${next === 'ACTIVE' ? '启用' : '停用'}用户「${row.username}」吗？`,
    theme: 'warning',
    confirmBtn: {
      theme: next === 'ACTIVE' ? 'primary' : 'danger',
      content: next === 'ACTIVE' ? '启用' : '停用',
    },
    onConfirm: async () => {
      try {
        await updateUserStatus(row.id, { status: next });
        MessagePlugin.success(next === 'ACTIVE' ? '用户已启用' : '用户已停用');
        dialog.hide();
        await fetchList();
      } catch (error) {
        MessagePlugin.error((error as Error).message || '操作失败');
      }
    },
  });
}

function handleResetPassword(row: UserView) {
  resetId.value = row.id;
  resetForm.value = { password: '' };
  resetVisible.value = true;
}

async function handleResetSubmit() {
  const result = await resetFormRef.value?.validate();
  if (result !== true) return;
  if (resetId.value === null) return;

  resetSubmitting.value = true;
  try {
    await resetUserPassword(resetId.value, { password: resetForm.value.password });
    MessagePlugin.success('密码已重置');
    resetVisible.value = false;
    resetId.value = null;
  } catch (error) {
    MessagePlugin.error((error as Error).message || '重置失败');
  } finally {
    resetSubmitting.value = false;
  }
}

function handleAssignRoles(row: UserView) {
  assignId.value = row.id;
  assignRoleIds.value = row.roles.map((r) => r.id);
  roleVisible.value = true;
}

async function handleRoleSubmit() {
  if (assignId.value === null) return;

  roleSubmitting.value = true;
  try {
    await updateUserRoles(assignId.value, { roleIds: assignRoleIds.value });
    MessagePlugin.success('角色已分配');
    roleVisible.value = false;
    assignId.value = null;
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '分配失败');
  } finally {
    roleSubmitting.value = false;
  }
}

onMounted(() => {
  fetchList();
  fetchRoles();
});
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
