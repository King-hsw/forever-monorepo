<template>
  <div class="perm-page">
    <!-- Tab 头 -->
    <header class="perm-page__header fade-up">
      <div class="tabs">
        <button
          type="button"
          class="tabs__btn"
          :class="{ 'is-active': tab === 'users' }"
          @click="tab = 'users'"
        >
          用户（{{ users.length }}）
        </button>
        <button
          type="button"
          class="tabs__btn"
          :class="{ 'is-active': tab === 'roles' }"
          @click="tab = 'roles'"
        >
          角色（{{ roles.length }}）
        </button>
        <span class="tabs__indicator" :class="{ 'is-right': tab === 'roles' }" />
      </div>
      <button
        v-if="!formOpen"
        type="button"
        class="btn btn--primary"
        @click="openCreate"
      >＋ 新增{{ tab === 'users' ? '用户' : '角色' }}</button>
    </header>

    <!-- ===== 新增表单（用户 / 角色共用布局） ===== -->
    <div v-if="formOpen" class="card perm-form fade-up" style="--stagger-index: 1">
      <h3>新增{{ tab === 'users' ? '用户' : '角色' }}</h3>

      <template v-if="tab === 'users'">
        <div class="perm-form__row">
          <div>
            <label class="field-label" for="u-username">用户名 <em>*</em></label>
            <input
              id="u-username"
              v-model="userForm.username"
              class="field-input"
              :class="{ 'is-invalid': !!formError }"
              type="text"
              autocomplete="off"
              placeholder="登录名，如：editor"
              @input="formError = ''"
            >
          </div>
          <div>
            <label class="field-label" for="u-password">初始密码 <em>*</em></label>
            <input
              id="u-password"
              v-model="userForm.password"
              class="field-input"
              :class="{ 'is-invalid': !!formError }"
              type="password"
              autocomplete="new-password"
              placeholder="至少 6 位"
              @input="formError = ''"
            >
          </div>
        </div>
        <div>
          <label class="field-label" for="u-nickname">昵称</label>
          <input id="u-nickname" v-model="userForm.nickname" class="field-input" type="text" placeholder="选填">
        </div>
        <fieldset class="perm-form__roles">
          <legend class="field-label">分配角色</legend>
          <label v-for="role in roles" :key="role.id" class="checkbox-item">
            <input v-model="userForm.roleIds" type="checkbox" :value="role.id">
            {{ role.name }} <code>{{ role.code }}</code>
          </label>
        </fieldset>
      </template>

      <template v-else>
        <div class="perm-form__row">
          <div>
            <label class="field-label" for="r-code">角色编码 <em>*</em></label>
            <input
              id="r-code"
              v-model="roleForm.code"
              class="field-input"
              :class="{ 'is-invalid': !!formError }"
              type="text"
              placeholder="如：EDITOR"
              @input="formError = ''"
            >
          </div>
          <div>
            <label class="field-label" for="r-name">角色名称 <em>*</em></label>
            <input
              id="r-name"
              v-model="roleForm.name"
              class="field-input"
              :class="{ 'is-invalid': !!formError }"
              type="text"
              placeholder="如：编辑"
              @input="formError = ''"
            >
          </div>
        </div>
        <div>
          <label class="field-label" for="r-remark">备注</label>
          <input id="r-remark" v-model="roleForm.remark" class="field-input" type="text" placeholder="选填">
        </div>
      </template>

      <p v-if="formError" class="field-error">{{ formError }}</p>
      <footer class="perm-form__actions">
        <button type="button" class="btn" @click="closeForm">取消</button>
        <button type="button" class="btn btn--primary" :disabled="saving" @click="saveForm">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </footer>
    </div>

    <!-- ===== 用户 Tab ===== -->
    <template v-if="tab === 'users'">
      <div class="card perm-list fade-up" style="--stagger-index: 2">
        <div v-for="(user, i) in users" :key="user.id" class="perm-list__row fade-up" :style="{ '--stagger-index': i + 2 }">
          <div class="perm-list__info">
            <strong>{{ user.nickname || user.username }}</strong>
            <code>@{{ user.username }}</code>
            <span v-for="role in user.roles" :key="role.id" class="badge badge--default">{{ role.name }}</span>
            <span v-if="!user.roles.length" class="badge badge--draft">无角色</span>
          </div>
          <span class="badge" :class="user.status === 'ACTIVE' ? 'badge--success' : 'badge--warning'">
            {{ user.status === 'ACTIVE' ? '正常' : '已禁用' }}
          </span>
          <div class="perm-list__ops">
            <button type="button" class="btn btn--ghost" @click="toggleRoles(user)">角色</button>
            <button type="button" class="btn btn--ghost" @click="toggleStatus(user)">
              {{ user.status === 'ACTIVE' ? '禁用' : '启用' }}
            </button>
            <button type="button" class="btn btn--ghost" @click="askResetPwd(user)">重置密码</button>
          </div>

          <!-- 行内展开：分配角色 -->
          <div v-if="rolesUserId === user.id" class="perm-list__expand">
            <fieldset class="perm-form__roles">
              <legend class="field-label">为 {{ user.username }} 分配角色（勾选后保存）</legend>
              <label v-for="role in roles" :key="role.id" class="checkbox-item">
                <input v-model="rolesDraft" type="checkbox" :value="role.id">
                {{ role.name }} <code>{{ role.code }}</code>
              </label>
            </fieldset>
            <footer class="perm-form__actions">
              <button type="button" class="btn" @click="rolesUserId = null">取消</button>
              <button type="button" class="btn btn--primary" :disabled="saving" @click="saveUserRoles(user)">
                保存
              </button>
            </footer>
          </div>
        </div>
        <p v-if="!users.length" class="list-empty">暂无用户</p>
      </div>
    </template>

    <!-- ===== 角色 Tab ===== -->
    <template v-else>
      <div class="card perm-list fade-up" style="--stagger-index: 2">
        <div v-for="(role, i) in roles" :key="role.id" class="perm-list__row fade-up" :style="{ '--stagger-index': i + 2 }">
          <div class="perm-list__info">
            <strong>{{ role.name }}</strong>
            <code>{{ role.code }}</code>
            <small v-if="role.remark">{{ role.remark }}</small>
            <span v-if="role.builtIn" class="badge badge--default">内置</span>
          </div>
          <div class="perm-list__ops">
            <button type="button" class="btn btn--ghost" @click="togglePerms(role)">权限配置</button>
            <button
              v-if="!role.builtIn"
              type="button"
              class="btn btn--ghost danger-text"
              @click="pendingDeleteRole = role"
            >删除</button>
          </div>

          <!-- 行内展开：按模块分组的权限点 -->
          <div v-if="permsRoleId === role.id" class="perm-list__expand">
            <p v-if="!permissionModules.length" class="list-empty">系统暂无权限点</p>
            <fieldset v-for="(perms, mod) in permissionModules" :key="mod" class="perm-form__roles">
              <legend class="field-label">
                {{ mod }}
                <button type="button" class="link-btn" @click="toggleModule(perms)">全选/反选</button>
              </legend>
              <label v-for="perm in perms" :key="perm.id" class="checkbox-item">
                <input v-model="permsDraft" type="checkbox" :value="perm.id">
                {{ perm.name }} <code :title="perm.code">{{ perm.code }}</code>
              </label>
            </fieldset>
            <footer class="perm-form__actions">
              <button type="button" class="btn" @click="permsRoleId = null">取消</button>
              <button type="button" class="btn btn--primary" :disabled="saving" @click="saveRolePerms(role)">
                保存权限
              </button>
            </footer>
          </div>
        </div>
        <p v-if="!roles.length" class="list-empty">暂无角色，先新建一个吧</p>
      </div>
    </template>

    <AdminConfirmDialog
      :open="!!pendingDeleteRole"
      title="确认删除角色"
      :message="`确定删除角色「${pendingDeleteRole?.name ?? ''}」吗？该角色下的用户将失去对应权限。`"
      confirm-text="删除"
      @confirm="removeRole"
      @cancel="pendingDeleteRole = null"
    />

    <AdminConfirmDialog
      :open="!!pendingPwdUser"
      title="重置密码"
      :message="`为用户「${pendingPwdUser?.username ?? ''}」设置新密码（至少 6 位）：`"
      confirm-text="重置"
      @confirm="confirmResetPwd"
      @cancel="pendingPwdUser = null"
    >
      <input
        v-model="pwdInput"
        class="field-input"
        type="password"
        placeholder="新密码"
        @keydown.enter="confirmResetPwd"
      >
    </AdminConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import type { SysPermission, SysRole, UserView } from '#shared/types'
import { apiFetch } from '~/utils/api'

definePageMeta({ layout: 'admin', permission: 'rbac:role:list' })

useAdminPage('用户权限')

const tab = ref<'users' | 'roles'>('users')
const saving = ref(false)
const formError = ref('')

/* ---------- 数据加载 ---------- */
// 角色列表接口返回 Map 结构，可能附带该角色已有的权限点 id（用于回显勾选）
type RoleItem = SysRole & { permissionIds?: number[] }
const users = ref<UserView[]>([])
const roles = ref<RoleItem[]>([])
const permissions = ref<SysPermission[]>([])

await useAsyncData('admin-permissions', async () => {
  const [u, r, p] = await Promise.all([
    apiFetch<UserView[]>('/api/admin/users'),
    apiFetch<RoleItem[]>('/api/admin/roles'),
    apiFetch<SysPermission[]>('/api/admin/permissions'),
  ])
  users.value = u
  roles.value = r
  permissions.value = p
}, { server: false })

/** 权限点按 module 分组（Object.groupBy 保持接口返回的首现顺序） */
const permissionModules = computed(() => Object.groupBy(permissions.value, p => p.module))

/* ---------- 新增表单 ---------- */
const formOpen = ref(false)
const userForm = reactive({ username: '', password: '', nickname: '', roleIds: [] as number[] })
const roleForm = reactive({ code: '', name: '', remark: '' })

function openCreate() {
  formError.value = ''
  if (tab.value === 'users') {
    Object.assign(userForm, { username: '', password: '', nickname: '', roleIds: [] })
  } else {
    Object.assign(roleForm, { code: '', name: '', remark: '' })
  }
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
}

async function saveForm() {
  if (tab.value === 'users') {
    if (!userForm.username.trim() || userForm.password.length < 6) {
      formError.value = '请填写用户名，密码至少 6 位'
      return
    }
  } else if (!roleForm.code.trim() || !roleForm.name.trim()) {
    formError.value = '请填写角色编码与名称'
    return
  }
  saving.value = true
  try {
    if (tab.value === 'users') {
      const user = await apiFetch<UserView>('/api/admin/users', {
        method: 'POST',
        body: {
          username: userForm.username.trim(),
          password: userForm.password,
          nickname: userForm.nickname.trim() || undefined,
          roleIds: userForm.roleIds,
        },
      })
      // 后端创建接口回传的 roles 恒为空列表，用勾选的角色本地补齐
      const created: UserView = { ...user, roles: rolesOf(userForm.roleIds) }
      users.value = [...users.value, created]
    } else {
      const role = await apiFetch<SysRole>('/api/admin/roles', {
        method: 'POST',
        body: { code: roleForm.code.trim(), name: roleForm.name.trim(), remark: roleForm.remark.trim() },
      })
      roles.value = [...roles.value, role]
    }
    closeForm()
  } catch (err) {
    alert(errMsg(err))
  } finally {
    saving.value = false
  }
}

/** 按 id 把角色 id 列表转成 SysRole 列表（后端 Void 响应时本地同步用） */
function rolesOf(ids: number[]): SysRole[] {
  return ids
    .map(id => roles.value.find(r => r.id === id))
    .filter((r): r is SysRole => !!r)
}

/* ---------- 用户操作 ---------- */
const rolesUserId = ref<number | null>(null)
const rolesDraft = ref<number[]>([])

function toggleRoles(user: UserView) {
  rolesUserId.value = rolesUserId.value === user.id ? null : user.id
  rolesDraft.value = user.roles.map(r => r.id)
}

async function saveUserRoles(user: UserView) {
  saving.value = true
  try {
    // 接口返回 Void，成功后直接用草稿本地同步
    await apiFetch(`/api/admin/users/${user.id}/roles`, {
      method: 'PUT',
      body: { roleIds: rolesDraft.value },
    })
    users.value = users.value.map(u => (u.id === user.id ? { ...u, roles: rolesOf(rolesDraft.value) } : u))
    rolesUserId.value = null
  } catch (err) {
    alert(errMsg(err))
  } finally {
    saving.value = false
  }
}

async function toggleStatus(user: UserView) {
  const next = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  try {
    await apiFetch(`/api/admin/users/${user.id}/status`, {
      method: 'PUT',
      body: { status: next },
    })
    users.value = users.value.map(u => (u.id === user.id ? { ...u, status: next } : u))
  } catch (err) {
    alert(errMsg(err))
  }
}

const pendingPwdUser = ref<UserView | null>(null)
const pwdInput = ref('')

function askResetPwd(user: UserView) {
  pwdInput.value = ''
  pendingPwdUser.value = user
}

async function confirmResetPwd() {
  const user = pendingPwdUser.value
  const password = pwdInput.value
  if (!user || !password || password.length < 6) return
  try {
    await apiFetch(`/api/admin/users/${user.id}/password`, {
      method: 'PUT',
      body: { password },
    })
    pendingPwdUser.value = null
  } catch (err) {
    alert(errMsg(err))
  }
}

/* ---------- 角色操作 ---------- */
const permsRoleId = ref<number | null>(null)
const permsDraft = ref<number[]>([])

function togglePerms(role: RoleItem) {
  permsRoleId.value = permsRoleId.value === role.id ? null : role.id
  permsDraft.value = [...(role.permissionIds ?? [])]
}

function toggleModule(perms: SysPermission[] = []) {
  const ids = perms.map(p => p.id)
  const allOn = ids.every(id => permsDraft.value.includes(id))
  permsDraft.value = allOn
    ? permsDraft.value.filter(id => !ids.includes(id))
    : [...new Set([...permsDraft.value, ...ids])]
}

async function saveRolePerms(role: RoleItem) {
  saving.value = true
  try {
    await apiFetch(`/api/admin/roles/${role.id}/permissions`, {
      method: 'PUT',
      body: { permissionIds: permsDraft.value },
    })
    // 本地同步已勾选的权限点，下次展开可回显
    roles.value = roles.value.map(r => (r.id === role.id ? { ...r, permissionIds: [...permsDraft.value] } : r))
    permsRoleId.value = null
  } catch (err) {
    alert(errMsg(err))
  } finally {
    saving.value = false
  }
}

const pendingDeleteRole = ref<SysRole | null>(null)

async function removeRole() {
  const role = pendingDeleteRole.value
  if (!role) return
  try {
    await apiFetch(`/api/admin/roles/${role.id}`, { method: 'DELETE' })
    roles.value = roles.value.filter(r => r.id !== role.id)
  } catch (err) {
    alert(errMsg(err))
  } finally {
    pendingDeleteRole.value = null
  }
}
</script>

<style scoped>
.perm-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.tabs {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 240px;
  padding: 4px;
  background: var(--c-bg-soft);
  border-radius: var(--radius-control);
}

.tabs__btn {
  padding: 7px 0;
  font-size: 13px;
  color: var(--c-text-secondary);
  background: none;
  border: none;
  border-radius: calc(var(--radius-control) - 2px);
  cursor: pointer;
  transition: color 0.2s;

  &.is-active {
    color: var(--c-primary);
    font-weight: 600;
  }
}

.tabs__indicator {
  position: absolute;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: var(--c-bg-card);
  border-radius: inherit;
  box-shadow: var(--shadow-card);
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);

  &.is-right {
    transform: translateX(100%);
  }
}

.perm-form {
  margin-bottom: 16px;
  padding: 20px;

  h3 {
    margin: 0 0 14px;
    font-size: 15px;
  }
}

.perm-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  > div {
    margin-bottom: 14px;
  }
}

.perm-form__roles {
  margin: 0 0 8px;
  padding: 0;
  border: none;

  legend {
    margin-bottom: 8px;
  }
}

.checkbox-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 16px 8px 0;
  font-size: 13px;
  cursor: pointer;

  code {
    padding: 1px 6px;
    font-size: 11px;
    color: var(--c-text-muted);
    background: var(--c-bg-soft);
    border-radius: 5px;
  }

  input[type='checkbox'] {
    accent-color: var(--c-primary);
  }
}

.link-btn {
  margin-left: 8px;
  font-size: 12px;
  color: var(--c-primary);
  background: none;
  border: none;
  cursor: pointer;
}

.perm-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;

  .btn {
    min-width: 76px;
    padding-block: 7px;
  }
}

.perm-list {
  padding: 6px 20px;
}

.perm-list__row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 0;

  & + & {
    border-top: 1px solid var(--c-border);
  }
}

.perm-list__info {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 10px;
  min-width: 200px;
  flex-wrap: wrap;

  strong {
    font-size: 14px;
  }

  code {
    padding: 1px 8px;
    font-size: 12px;
    color: var(--c-primary);
    background: var(--c-primary-light);
    border-radius: 6px;
  }

  small {
    overflow: hidden;
    color: var(--c-text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.perm-list__ops {
  display: flex;
  flex-shrink: 0;
  gap: 2px;

  .btn {
    padding: 5px 10px;
    font-size: 13px;
  }
}

.perm-list__expand {
  width: 100%;
  padding: 12px;
  background: var(--c-bg-soft);
  border-radius: var(--radius-control);
}

.list-empty {
  padding: 24px 0;
  font-size: 13px;
  color: var(--c-text-muted);
  text-align: center;
}

@media (max-width: 640px) {
  .perm-form__row {
    grid-template-columns: 1fr;
  }
}
</style>
