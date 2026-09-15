<template>
  <div class="page-container">
    <t-card :bordered="false" class="page-card">
      <template #title>
        <div class="card-title">
          <span>角色与权限</span>
          <span class="card-title__hint">共 {{ list.length }} 个角色</span>
        </div>
      </template>

      <template #actions>
        <t-button v-if="userStore.hasPermission('rbac:role:create')" theme="primary" @click="handleCreate">
          <template #icon><t-icon name="add" /></template>
          新建角色
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
        <template #code="{ row }">
          <code class="role-code">{{ row.code }}</code>
        </template>

        <template #remark="{ row }">
          <span :class="{ 'text-muted': !row.remark }">{{ row.remark || '-' }}</span>
        </template>

        <template #builtIn="{ row }">
          <t-tag v-if="row.builtIn" theme="warning" variant="light-outline">内置</t-tag>
          <t-tag v-else theme="default" variant="light-outline">自定义</t-tag>
        </template>

        <template #op="{ row }">
          <t-space size="small">
            <t-link
              v-if="userStore.hasPermission('rbac:role:permissions')"
              theme="primary"
              hover="color"
              @click="handleConfigPermission(row)"
            >
              配置权限
            </t-link>
            <template v-if="userStore.hasPermission('rbac:role:delete')">
              <t-link v-if="!row.builtIn" theme="danger" hover="color" @click="handleDelete(row)">删除</t-link>
              <t-tooltip v-else content="内置角色不可删除">
                <t-link theme="danger" hover="color" disabled>删除</t-link>
              </t-tooltip>
            </template>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 新建角色弹窗 -->
    <t-dialog
      v-model:visible="createVisible"
      header="新建角色"
      :confirm-btn="{ loading: submitting }"
      width="480px"
      @confirm="handleCreateSubmit"
    >
      <t-form
        ref="createFormRef"
        :data="createForm"
        :rules="CREATE_RULES"
        label-width="80px"
        @submit="handleCreateSubmit"
      >
        <t-form-item label="编码" name="code">
          <t-input v-model="createForm.code" placeholder="大写字母 + 下划线，如 ADMIN_USER" :maxlength="30" />
          <span class="form-hint">格式：2–30 位大写字母或下划线 [A-Z_]</span>
        </t-form-item>
        <t-form-item label="名称" name="name">
          <t-input v-model="createForm.name" placeholder="角色名称" :maxlength="50" />
        </t-form-item>
        <t-form-item label="备注" name="remark">
          <t-input v-model="createForm.remark" placeholder="备注，可留空" :maxlength="200" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 配置权限弹窗 -->
    <t-dialog
      v-model:visible="permissionVisible"
      header="配置权限"
      :confirm-btn="{ loading: permissionSubmitting, content: '保存' }"
      width="640px"
      @confirm="handlePermissionSubmit"
    >
      <div v-if="permissionGroups.length" class="permission-groups">
        <div v-for="group in permissionGroups" :key="group.module" class="permission-group">
          <div class="permission-group__title">{{ group.module }}</div>
          <t-checkbox-group v-model="editPermissionIds" :options="group.options" />
        </div>
      </div>
      <t-loading v-else :loading="permissionLoading" text="加载权限中…" />
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstanceFunctions, FormRule, PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';

import {
  createRole,
  deleteRole,
  getPermissionList,
  getRoleList,
  updateRolePermissions,
} from '@/api/system';
import type { RoleView, SysPermission } from '@/api/model/types';
import { useUserStore } from '@/store';

defineOptions({ name: 'RoleList' });

const userStore = useUserStore();

const list = ref<RoleView[]>([]);
const loading = ref(false);

/* 权限配置 */
const permissionVisible = ref(false);
const permissionLoading = ref(false);
const permissionSubmitting = ref(false);
const permissions = ref<SysPermission[]>([]);
const editPermissionIds = ref<number[]>([]);
const editRoleId = ref<number | null>(null);

/** 全部权限按 module 分组，每组共享同一个 v-model 数组 */
const permissionGroups = computed(() => {
  const map = new Map<string, { label: string; value: number }[]>();
  for (const p of permissions.value) {
    const options = map.get(p.module) ?? [];
    options.push({ label: `${p.name}（${p.code}）`, value: p.id });
    map.set(p.module, options);
  }
  return Array.from(map.entries()).map(([module, options]) => ({ module, options }));
});

/* 新建角色弹窗 */
const createVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstanceFunctions>();
const createForm = ref<{ code: string; name: string; remark: string }>({
  code: '',
  name: '',
  remark: '',
});

const CREATE_RULES: Record<string, FormRule[]> = {
  code: [
    { required: true, message: '请输入角色编码', type: 'error' },
    {
      validator: (val: unknown) => (typeof val === 'string' ? /^[A-Z_]{2,30}$/.test(val) : false),
      message: '编码需为 2–30 位大写字母或下划线 [A-Z_]',
      type: 'error',
    },
  ],
  name: [{ required: true, message: '请输入角色名称', type: 'error' }],
};

const COLUMNS: PrimaryTableCol[] = [
  { colKey: 'name', title: '角色名', width: 160 },
  { colKey: 'code', title: '编码', width: 180 },
  { colKey: 'remark', title: '备注', minWidth: 160 },
  { colKey: 'builtIn', title: '是否内置', width: 100 },
  { colKey: 'op', title: '操作', width: 160, fixed: 'right' as const },
];

/** 角色接口返回全量数组，前端分页 */
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

async function fetchList() {
  loading.value = true;
  try {
    list.value = (await getRoleList()) ?? [];
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载角色失败');
  } finally {
    loading.value = false;
  }
}

function resetCreateForm() {
  createForm.value = { code: '', name: '', remark: '' };
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
      code: createForm.value.code.trim(),
      name: createForm.value.name.trim(),
      remark: createForm.value.remark.trim() || undefined,
    };
    await createRole(payload);
    MessagePlugin.success('角色已创建');
    createVisible.value = false;
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '创建失败');
  } finally {
    submitting.value = false;
  }
}

function handleConfigPermission(row: RoleView) {
  editRoleId.value = row.id;
  editPermissionIds.value = [...row.permissionIds];
  permissionVisible.value = true;
  // 权限列表首次打开时拉取
  if (permissions.value.length === 0) {
    loadPermissions();
  }
}

async function loadPermissions() {
  permissionLoading.value = true;
  try {
    permissions.value = (await getPermissionList()) ?? [];
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载权限失败');
  } finally {
    permissionLoading.value = false;
  }
}

async function handlePermissionSubmit() {
  if (editRoleId.value === null) return;

  permissionSubmitting.value = true;
  try {
    await updateRolePermissions(editRoleId.value, { permissionIds: editPermissionIds.value });
    MessagePlugin.success('权限已保存');
    permissionVisible.value = false;
    editRoleId.value = null;
    await fetchList();
  } catch (error) {
    MessagePlugin.error((error as Error).message || '保存失败');
  } finally {
    permissionSubmitting.value = false;
  }
}

function handleDelete(row: RoleView) {
  const dialog = DialogPlugin.confirm({
    header: '删除角色',
    body: `确定删除角色「${row.name}」吗？删除后该角色下的用户将失去对应权限。`,
    theme: 'warning',
    confirmBtn: { theme: 'danger', content: '删除' },
    onConfirm: async () => {
      try {
        await deleteRole(row.id);
        MessagePlugin.success('角色已删除');
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

.role-code {
  font-family: var(--td-font-family-mono, monospace);
  font-size: 13px;
  color: var(--td-text-color-secondary);
}

.text-muted {
  color: var(--td-text-color-placeholder);
}

.form-hint {
  margin-left: 12px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.permission-groups {
  max-height: 50vh;
  overflow-y: auto;
}

.permission-group {
  margin-bottom: 16px;

  &__title {
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--td-text-color-primary);
  }
}
</style>
