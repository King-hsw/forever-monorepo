<template>
  <div class="friends-admin">
    <header class="friends-admin__header fade-up">
      <p class="friends-admin__hint">
        访客提交的友链申请会出现在这里，审核通过后在前台「友链」页展示；共 {{ list.length }} 条
      </p>
      <button type="button" class="btn btn--primary" @click="openCreate">+ 添加友链</button>
    </header>

    <!-- 列表 -->
    <div class="card friends-list fade-up" style="--stagger-index: 1">
      <div
        v-for="(link, i) in list"
        :key="link.id"
        class="friends-list__row fade-up"
        :style="{ '--stagger-index': i + 2 }"
      >
        <!-- 图标加载失败时由 SafeImage 渲染首字占位（带 --fallback 类，与未填图标时一致） -->
        <SafeImage
          v-if="link.iconUrl"
          :src="link.iconUrl"
          alt=""
          class="friends-list__icon friends-list__icon--fallback"
          :fallback-text="initialOf(link.name)"
          variant="avatar"
        />
        <span v-else class="friends-list__icon friends-list__icon--fallback" aria-hidden="true">
          {{ initialOf(link.name) }}
        </span>

        <div class="friends-list__main">
          <div class="friends-list__title">
            <strong>{{ link.name }}</strong>
            <span class="badge" :class="moderationClass(link.status)">{{ moderationLabel(link.status) }}</span>
            <span
              v-if="link.status === 'REJECTED' && link.rejectReason"
              class="friends-list__reason"
              :title="link.rejectReason"
            >{{ link.rejectReason }}</span>
          </div>
          <a
            class="friends-list__site"
            :href="link.siteUrl"
            target="_blank"
            rel="noopener noreferrer"
          >{{ link.siteUrl }}</a>
          <small v-if="link.description" class="friends-list__desc">{{ link.description }}</small>
          <small v-if="link.contact" class="friends-list__contact">联系方式：{{ link.contact }}</small>
        </div>

        <div class="friends-list__meta">
          <span>申请于 {{ formatDateTime(link.createdAt) }}</span>
          <span v-if="link.reviewedAt">审核于 {{ formatDateTime(link.reviewedAt) }}</span>
        </div>

        <div class="friends-list__ops">
          <button
            v-if="link.status !== 'APPROVED'"
            type="button"
            class="btn btn--ghost"
            :disabled="actingId === link.id"
            @click="doApprove(link)"
          >通过</button>
          <button
            v-if="link.status !== 'REJECTED'"
            type="button"
            class="btn btn--ghost"
            :disabled="actingId === link.id"
            @click="openReject(link)"
          >驳回</button>
          <button type="button" class="btn btn--ghost" @click="openEdit(link)">编辑</button>
          <button type="button" class="btn btn--ghost danger-text" @click="pendingDelete = link">删除</button>
        </div>
      </div>
      <p v-if="!list.length && !loading" class="friends-list__empty">
        暂无友链申请
      </p>
    </div>

    <!-- 驳回原因输入 -->
    <div v-if="rejecting" class="card reject-form fade-up">
      <h3>驳回「{{ rejecting.name }}」的申请</h3>
      <input
        v-model="rejectReason"
        class="field-input"
        type="text"
        maxlength="200"
        placeholder="驳回原因（选填，仅管理端可见）"
        @keyup.enter="confirmReject"
      >
      <footer class="reject-form__actions">
        <button type="button" class="btn" @click="rejecting = null">取消</button>
        <button type="button" class="btn btn--danger" :disabled="acting" @click="confirmReject">确认驳回</button>
      </footer>
    </div>

    <!-- 新增 / 编辑友链弹窗（预填 = 编辑，置空 = 新增） -->
    <Teleport to="body">
      <Transition name="create-dialog">
        <div
          v-if="dialogOpen"
          class="create-dialog__overlay"
          role="dialog"
          aria-modal="true"
          :aria-label="editingId !== null ? '编辑友链' : '添加友链'"
          @click.self="dialogOpen = false"
        >
          <div class="create-dialog card">
            <h3 class="create-dialog__title">{{ editingId !== null ? '编辑友链' : '添加友链' }}</h3>
            <div>
              <label class="field-label" for="friend-name">站点名称 <em>*</em></label>
              <input
                id="friend-name"
                v-model="form.name"
                class="field-input"
                :class="{ 'is-invalid': !!errors.name }"
                type="text"
                @input="errors.name = ''"
              >
              <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
            </div>
            <div>
              <label class="field-label" for="friend-url">站点地址 <em>*</em></label>
              <input
                id="friend-url"
                v-model="form.siteUrl"
                class="field-input"
                :class="{ 'is-invalid': !!errors.siteUrl }"
                type="url"
                placeholder="https://example.com"
                @input="errors.siteUrl = ''"
              >
              <p v-if="errors.siteUrl" class="field-error">{{ errors.siteUrl }}</p>
            </div>
            <div>
              <label class="field-label" for="friend-icon">图标地址</label>
              <input id="friend-icon" v-model="form.iconUrl" class="field-input" type="url" placeholder="选填">
            </div>
            <div>
              <label class="field-label" for="friend-desc">简介</label>
              <input id="friend-desc" v-model="form.description" class="field-input" type="text" placeholder="选填">
            </div>
            <div>
              <label class="field-label" for="friend-contact">联系方式</label>
              <input id="friend-contact" v-model="form.contact" class="field-input" type="text" placeholder="选填，仅管理端可见">
            </div>
            <footer class="create-dialog__actions">
              <button type="button" class="btn" :disabled="saving" @click="dialogOpen = false">取消</button>
              <button type="button" class="btn btn--primary" :disabled="saving" @click="saveForm">
                {{ saving ? '保存中…' : '保存' }}
              </button>
            </footer>
          </div>
        </div>
      </Transition>
    </Teleport>

    <AdminConfirmDialog
      :open="!!pendingDelete"
      title="确认删除"
      :message="deleteMessage"
      confirm-text="删除"
      @confirm="confirmRemove"
      @cancel="pendingDelete = null"
    />
  </div>
</template>

<script setup lang="ts">
import type { FriendLink, FriendLinkApplyInput, FriendLinkUpdateInput } from '#shared/types'
import { apiFetch } from '~/utils/api'
import { formatDateTime } from '~/utils/format'

definePageMeta({ layout: 'admin', permission: 'friend-link:list' })

useAdminPage('友链管理')

/** 友链列表与操作（仅本页使用） */
const list = ref<FriendLink[]>([])
const loading = ref(false)

/** 拉取友链全量列表（含待审核与已驳回），每次都取最新数据 */
async function fetch() {
  loading.value = true
  try {
    list.value = await apiFetch<FriendLink[]>('/api/admin/friend-links')
  }
  finally {
    loading.value = false
  }
}

function replace(link: FriendLink) {
  const idx = list.value.findIndex(f => f.id === link.id)
  if (idx >= 0) list.value[idx] = link
}

/** 新增友链（管理端直接创建，状态为 APPROVED），成功后插入列表开头 */
async function create(input: FriendLinkApplyInput): Promise<void> {
  const link = await apiFetch<FriendLink>('/api/admin/friend-links', {
    method: 'POST',
    body: input as unknown as Record<string, unknown>,
  })
  list.value = [link, ...list.value]
}

/** 全量更新友链（未传的字段会被后端置空） */
async function update(id: number, input: FriendLinkUpdateInput): Promise<void> {
  replace(await apiFetch<FriendLink>(`/api/admin/friend-links/${id}`, {
    method: 'PUT',
    body: input as unknown as Record<string, unknown>,
  }))
}

/** 通过审核 */
async function approve(id: number): Promise<void> {
  replace(await apiFetch<FriendLink>(`/api/admin/friend-links/${id}/approve`, { method: 'POST' }))
}

/** 驳回申请，可附带原因 */
async function reject(id: number, reason?: string): Promise<void> {
  replace(await apiFetch<FriendLink>(`/api/admin/friend-links/${id}/reject`, {
    method: 'POST',
    query: reason ? { reason } : undefined,
  }))
}

/** 删除友链 */
async function remove(id: number): Promise<void> {
  await apiFetch<void>(`/api/admin/friend-links/${id}`, { method: 'DELETE' })
  list.value = list.value.filter(f => f.id !== id)
}

// 仅客户端拉取：登录令牌存在 localStorage，SSR 阶段拿不到（避免直接访问 URL 时 SSR 401 失败）
await useAsyncData('admin-friend-links', async () => {
  await fetch()
}, { server: false })

const saving = ref(false)
const acting = ref(false)
const actingId = ref<number | null>(null)

/* ---------- 审核通过 / 驳回 ---------- */
async function doApprove(link: FriendLink) {
  acting.value = true
  actingId.value = link.id
  try {
    await approve(link.id)
  } catch (err) {
    alert(errMsg(err))
  } finally {
    acting.value = false
    actingId.value = null
  }
}

const rejecting = ref<FriendLink | null>(null)
const rejectReason = ref('')

function openReject(link: FriendLink) {
  rejecting.value = link
  rejectReason.value = ''
}

async function confirmReject() {
  if (!rejecting.value) return
  acting.value = true
  try {
    await reject(rejecting.value.id, rejectReason.value.trim() || undefined)
    rejecting.value = null
  } catch (err) {
    alert(errMsg(err))
  } finally {
    acting.value = false
  }
}

/* ---------- 新增 / 编辑（同一弹窗，预填 = 编辑） ---------- */
const dialogOpen = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({ name: '', siteUrl: '', iconUrl: '', description: '', contact: '' })
const errors = reactive({ name: '', siteUrl: '' })

function openCreate() {
  editingId.value = null
  Object.assign(form, { name: '', siteUrl: '', iconUrl: '', description: '', contact: '' })
  errors.name = ''
  errors.siteUrl = ''
  dialogOpen.value = true
}

function openEdit(link: FriendLink) {
  editingId.value = link.id
  Object.assign(form, {
    name: link.name,
    siteUrl: link.siteUrl,
    iconUrl: link.iconUrl ?? '',
    description: link.description ?? '',
    contact: link.contact ?? '',
  })
  errors.name = ''
  errors.siteUrl = ''
  dialogOpen.value = true
}

async function saveForm() {
  const name = form.name.trim()
  const siteUrl = form.siteUrl.trim()
  if (!name) errors.name = '站点名称不能为空'
  if (!siteUrl) {
    errors.siteUrl = '站点地址不能为空'
  } else if (editingId.value === null && !/^https?:\/\//i.test(siteUrl)) {
    // 前缀校验仅用于新增；编辑保留原值（历史数据可能不带前缀）
    errors.siteUrl = '站点地址需以 http(s):// 开头'
  }
  if (errors.name || errors.siteUrl) return

  saving.value = true
  try {
    const common = {
      name,
      siteUrl,
      iconUrl: form.iconUrl.trim() || undefined,
      description: form.description.trim() || undefined,
      contact: form.contact.trim() || undefined,
    }
    if (editingId.value !== null) {
      // 后端为全量更新：带上当前审核状态与驳回原因，避免编辑时冲掉
      const current = list.value.find(f => f.id === editingId.value)
      await update(editingId.value, {
        ...common,
        status: current?.status ?? 'PENDING',
        rejectReason: current?.rejectReason || undefined,
      })
    } else {
      await create(common)
    }
    dialogOpen.value = false
  } catch (err) {
    alert(errMsg(err))
  } finally {
    saving.value = false
  }
}

useOnEscape(() => {
  if (dialogOpen.value && !saving.value) dialogOpen.value = false
})

/* ---------- 删除确认 ---------- */
const pendingDelete = ref<FriendLink | null>(null)

const deleteMessage = computed(() =>
  pendingDelete.value ? `确定删除友链「${pendingDelete.value.name}」吗？` : '',
)

async function confirmRemove() {
  if (!pendingDelete.value) return
  try {
    await remove(pendingDelete.value.id)
  } catch (err) {
    alert(errMsg(err))
  } finally {
    pendingDelete.value = null
  }
}
</script>

<style scoped>
.friends-admin__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.friends-admin__hint {
  margin: 0;
  font-size: 13px;
  color: var(--c-text-muted);
}

.reject-form {
  margin-bottom: 16px;
  padding: 20px;

  h3 {
    margin: 0 0 14px;
    font-size: 15px;
  }

  > div {
    margin-bottom: 14px;
  }
}

.create-dialog__overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(28 25 23 / 40%);
}

.create-dialog {
  width: min(460px, 100%);
  max-height: calc(100vh - 48px);
  padding: 22px;
  overflow-y: auto;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card-hover);

  > div {
    margin-bottom: 14px;
  }
}

.create-dialog__title {
  margin: 0 0 14px;
  font-size: 16px;
}

.create-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;

  .btn {
    min-width: 76px;
    padding-block: 7px;
  }
}

.reject-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;

  .btn {
    min-width: 76px;
    padding-block: 7px;
  }
}

.create-dialog-enter-active,
.create-dialog-leave-active {
  transition: opacity 0.22s ease;

  .create-dialog {
    transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }
}

.create-dialog-enter-from,
.create-dialog-leave-to {
  opacity: 0;

  .create-dialog {
    transform: translateY(12px) scale(0.96);
  }
}

.friends-list {
  padding: 6px 20px;
}

.friends-list__row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;

  & + & {
    border-top: 1px solid var(--c-border);
  }
}

.friends-list__icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
}

.friends-list__icon--fallback {
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--c-on-primary);
  background: linear-gradient(135deg, var(--c-primary), var(--k-grape));
}

.friends-list__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.friends-list__title {
  display: flex;
  align-items: center;
  gap: 8px;

  strong {
    font-size: 14px;
  }
}

.friends-list__reason {
  overflow: hidden;
  font-size: 11.5px;
  color: var(--c-danger);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.friends-list__site {
  overflow: hidden;
  max-width: 100%;
  font-size: 12px;
  color: var(--c-primary);
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
}

.friends-list__desc,
.friends-list__contact {
  font-size: 12px;
  color: var(--c-text-muted);
}

.friends-list__meta {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--c-text-muted);
  text-align: right;
}

.friends-list__ops {
  display: flex;
  flex-shrink: 0;
  gap: 2px;

  .btn {
    padding: 5px 10px;
    font-size: 13px;
  }
}

.friends-list__empty {
  width: 100%;
  padding: 24px 0;
  font-size: 13px;
  color: var(--c-text-muted);
  text-align: center;
}

@media (max-width: 900px) {
  .friends-list__row {
    flex-wrap: wrap;
  }

  .friends-list__meta {
    flex-direction: row;
    width: 100%;
    gap: 12px;
    text-align: left;
  }
}
</style>
