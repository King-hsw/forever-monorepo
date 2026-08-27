<template>
  <div class="profile-page">
    <header class="profile-page__header fade-up">
      <p class="profile-page__hint">
        资料用于头像展示与对外署名；保存即时生效
      </p>
      <button
        v-if="dirty"
        type="button"
        class="btn"
        @click="resetDrafts"
      >放弃修改</button>
    </header>

    <!-- 头像 -->
    <section class="profile-card fade-up" style="--stagger-index: 1">
      <header class="profile-card__head">
        <span class="profile-card__icon" aria-hidden="true">🖼️</span>
        <div>
          <h3>头像</h3>
          <small>未上传时按邮箱 hash 自动生成 Gravatar 头像</small>
        </div>
      </header>

      <div class="profile-card__body">
        <div class="profile-card__avatar">
          <img v-if="profile?.avatarUrl" :src="profile.avatarUrl" alt="当前头像">
          <span v-else aria-hidden="true">{{ initialOf(profile?.nickname || auth.username) }}</span>
        </div>
        <div class="profile-card__actions">
          <div class="profile-card__btns">
            <button type="button" class="btn" :disabled="avatarBusy" @click="fileRef?.click()">
              {{ avatarBusy ? '上传中…' : '更换头像' }}
            </button>
            <button
              v-if="hasUploadedAvatar"
              type="button"
              class="btn btn--ghost"
              :disabled="avatarBusy"
              @click="removeAvatar"
            >移除（用邮箱头像）</button>
          </div>
          <small class="profile-card__tip">支持 jpg / png / webp，不超过 2MB</small>
          <input
            ref="fileRef"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            @change="onFilePicked"
          >
        </div>
      </div>
    </section>

    <!-- 基本资料 -->
    <section class="profile-card fade-up" style="--stagger-index: 2">
      <header class="profile-card__head">
        <span class="profile-card__icon" aria-hidden="true">📝</span>
        <div>
          <h3>基本资料</h3>
        </div>
      </header>

      <form @submit.prevent="saveProfile">
        <div class="profile-row">
          <span class="profile-row__label">账号</span>
          <div class="profile-row__control">
            <span class="profile-row__readonly">{{ profile?.username ?? '…' }}</span>
            <small class="profile-row__desc">登录账号不可修改</small>
          </div>
        </div>

        <div class="profile-row">
          <label class="profile-row__label" for="pf-nickname">昵称</label>
          <div class="profile-row__control">
            <input
              id="pf-nickname"
              v-model="drafts.nickname"
              class="field-input"
              :class="{ 'is-invalid': !!errors.nickname }"
              type="text"
              placeholder="对外展示的称呼"
              @input="errors.nickname = ''"
            >
            <p v-if="errors.nickname" class="field-error">{{ errors.nickname }}</p>
          </div>
        </div>

        <div class="profile-row">
          <label class="profile-row__label" for="pf-email">邮箱</label>
          <div class="profile-row__control">
            <input
              id="pf-email"
              v-model="drafts.email"
              class="field-input"
              :class="{ 'is-invalid': !!errors.email }"
              type="email"
              spellcheck="false"
              placeholder="不对外展示，用于生成 Gravatar 头像"
              @input="errors.email = ''"
            >
            <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
          </div>
        </div>

        <div class="profile-row">
          <label class="profile-row__label" for="pf-site">个人主页</label>
          <div class="profile-row__control">
            <input
              id="pf-site"
              v-model="drafts.site"
              class="field-input"
              :class="{ 'is-invalid': !!errors.site }"
              type="url"
              spellcheck="false"
              placeholder="https://…"
              @input="errors.site = ''"
            >
            <p v-if="errors.site" class="field-error">{{ errors.site }}</p>
          </div>
        </div>

        <footer class="profile-card__foot">
          <Transition name="toast">
            <p v-if="profileMsg" class="profile-card__success" role="status">{{ profileMsg }}</p>
          </Transition>
          <button
            type="submit"
            class="btn btn--primary"
            :disabled="saving || !dirty"
          >{{ saving ? '保存中…' : dirty ? '保存修改' : '暂无修改' }}</button>
        </footer>
      </form>
    </section>

    <!-- 修改密码 -->
    <section class="profile-card fade-up" style="--stagger-index: 3">
      <header class="profile-card__head">
        <span class="profile-card__icon" aria-hidden="true">🔒</span>
        <div>
          <h3>修改密码</h3>
          <small>需 6-100 位，建议与常用密码不同</small>
        </div>
      </header>

      <form @submit.prevent="changePassword">
        <div class="profile-row">
          <label class="profile-row__label" for="pf-old">原密码</label>
          <div class="profile-row__control">
            <input
              id="pf-old"
              v-model="pwd.old"
              class="field-input"
              type="password"
              autocomplete="current-password"
              placeholder="请输入当前密码"
            >
          </div>
        </div>

        <div class="profile-row">
          <label class="profile-row__label" for="pf-next">新密码</label>
          <div class="profile-row__control">
            <input
              id="pf-next"
              v-model="pwd.next"
              class="field-input"
              type="password"
              autocomplete="new-password"
              placeholder="6-100 位"
            >
          </div>
        </div>

        <div class="profile-row">
          <label class="profile-row__label" for="pf-confirm">确认新密码</label>
          <div class="profile-row__control">
            <input
              id="pf-confirm"
              v-model="pwd.confirm"
              class="field-input"
              type="password"
              autocomplete="new-password"
              placeholder="再输入一次新密码"
            >
          </div>
        </div>

        <footer class="profile-card__foot">
          <Transition name="toast">
            <p v-if="pwdMsg" :class="pwdMsgIsError ? 'profile-card__error' : 'profile-card__success'" role="status">{{ pwdMsg }}</p>
          </Transition>
          <button
            type="submit"
            class="btn btn--primary"
            :disabled="pwdSaving"
          >{{ pwdSaving ? '更新中…' : '更新密码' }}</button>
        </footer>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ProfileInfo } from '#shared/types'
import { initialOf } from '~/utils/format'
import { apiFetch } from '~/utils/api'

definePageMeta({ layout: 'admin' })

useHead({ title: '个人资料 - 补陋阁 后台' })
useState('admin-page-title', () => '个人资料')

const auth = useAuthStore()
// 资料由 admin 布局统一拉取并缓存，本页直接读写同一份 state
const profile = useState<ProfileInfo | null>('admin-profile', () => null)

/* ---------- 基本资料草稿 ---------- */
const drafts = reactive({ nickname: '', email: '', site: '' })
const errors = reactive<Record<'nickname' | 'email' | 'site', string>>({
  nickname: '',
  email: '',
  site: '',
})

let synced = false
watch(profile, (p) => {
  if (p && !synced) {
    drafts.nickname = p.nickname ?? ''
    drafts.email = p.email ?? ''
    drafts.site = p.site ?? ''
    synced = true
  }
}, { immediate: true })

const dirty = computed(() =>
  profile.value !== null && (
    drafts.nickname !== (profile.value.nickname ?? '')
    || drafts.email !== (profile.value.email ?? '')
    || drafts.site !== (profile.value.site ?? '')),
)

function resetDrafts() {
  drafts.nickname = profile.value?.nickname ?? ''
  drafts.email = profile.value?.email ?? ''
  drafts.site = profile.value?.site ?? ''
  errors.nickname = errors.email = errors.site = ''
}

/** 与服务端规则保持一致，提前拦截 */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function validateField(field: 'nickname' | 'email' | 'site'): string {
  const v = drafts[field].trim()
  if (v === '') return '' // 留空 = 清空字段
  if (field === 'nickname' && v.length > 50) return '昵称最长 50 字'
  if (field === 'email' && !EMAIL_RE.test(v)) return '邮箱格式不正确'
  if (field === 'site' && !v.startsWith('http://') && !v.startsWith('https://')) {
    return '必须以 http:// 或 https:// 开头'
  }
  return ''
}

const saving = ref(false)
const profileMsg = ref('')
let profileMsgTimer: ReturnType<typeof setTimeout> | null = null

async function saveProfile() {
  for (const f of ['nickname', 'email', 'site'] as const) {
    errors[f] = validateField(f)
  }
  if (errors.nickname || errors.email || errors.site) return

  saving.value = true
  try {
    profile.value = await apiFetch<ProfileInfo>('/api/admin/profile', {
      method: 'PUT',
      body: {
        nickname: drafts.nickname.trim(),
        email: drafts.email.trim(),
        site: drafts.site.trim(),
      },
    })
    profileMsg.value = '已保存'
    if (profileMsgTimer) clearTimeout(profileMsgTimer)
    profileMsgTimer = setTimeout(() => (profileMsg.value = ''), 3000)
  }
  catch (err) {
    alert(err instanceof Error ? err.message : '保存失败')
  }
  finally {
    saving.value = false
  }
}

/* ---------- 头像 ---------- */
const fileRef = ref<HTMLInputElement | null>(null)
const avatarBusy = ref(false)
/** avatarUrl 以 /uploads/ 开头表示已上传自定义头像 */
const hasUploadedAvatar = computed(() => profile.value?.avatarUrl?.startsWith('/uploads/') ?? false)

function onFilePicked(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    alert('仅支持 jpg / png / webp 图片')
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    alert('头像不能超过 2MB')
    return
  }
  const form = new FormData()
  form.append('file', file)
  avatarBusy.value = true
  apiFetch<ProfileInfo>('/api/admin/profile/avatar', { method: 'POST', body: form })
    .then(p => { profile.value = p })
    .catch((err: unknown) => alert(err instanceof Error ? err.message : '上传失败'))
    .finally(() => { avatarBusy.value = false })
}

function removeAvatar() {
  avatarBusy.value = true
  apiFetch<ProfileInfo>('/api/admin/profile/avatar', { method: 'DELETE' })
    .then(p => { profile.value = p })
    .catch((err: unknown) => alert(err instanceof Error ? err.message : '删除失败'))
    .finally(() => { avatarBusy.value = false })
}

/* ---------- 修改密码 ---------- */
const pwd = reactive({ old: '', next: '', confirm: '' })
const pwdSaving = ref(false)
const pwdMsg = ref('')
const pwdMsgIsError = ref(true)
let pwdMsgTimer: ReturnType<typeof setTimeout> | null = null

function reportPwd(msg: string, isError: boolean) {
  pwdMsg.value = msg
  pwdMsgIsError.value = isError
  if (pwdMsgTimer) clearTimeout(pwdMsgTimer)
  if (!isError) pwdMsgTimer = setTimeout(() => (pwdMsg.value = ''), 3000)
}

async function changePassword() {
  if (!pwd.old) {
    reportPwd('请输入原密码', true)
    return
  }
  if (pwd.next.length < 6 || pwd.next.length > 100) {
    reportPwd('新密码须 6-100 位', true)
    return
  }
  if (pwd.next !== pwd.confirm) {
    reportPwd('两次输入的新密码不一致', true)
    return
  }
  pwdSaving.value = true
  try {
    await apiFetch('/api/admin/profile/password', {
      method: 'PUT',
      body: { oldPassword: pwd.old, newPassword: pwd.next },
    })
    pwd.old = pwd.next = pwd.confirm = ''
    reportPwd('密码已更新', false)
  }
  catch (err) {
    reportPwd(err instanceof Error ? err.message : '更新失败', true)
  }
  finally {
    pwdSaving.value = false
  }
}

onBeforeUnmount(() => {
  if (profileMsgTimer) clearTimeout(profileMsgTimer)
  if (pwdMsgTimer) clearTimeout(pwdMsgTimer)
})
</script>

<style scoped>
.profile-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.profile-page__hint {
  margin: 0;
  font-size: 13px;
  color: var(--c-text-muted);
}

/* ===== 分区（沿用全站「无外壳」视觉：留白 + 分隔线） ===== */
.profile-card {
  margin-bottom: 18px;
  padding: 18px 20px 6px;
}

.profile-card__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--c-border);

  h3 {
    margin: 0;
    font-size: 15px;
  }

  small {
    display: block;
    margin-top: 2px;
    color: var(--c-text-muted);
  }
}

.profile-card__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  font-size: 19px;
  background: var(--c-bg-soft);
  border-radius: 12px;
}

/* ===== 头像区 ===== */
.profile-card__body {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
  padding-top: 16px;
}

.profile-card__avatar {
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  overflow: hidden;
  color: var(--c-primary-hover);
  font-size: 34px;
  font-weight: 700;
  background: var(--c-primary-light);
  border-radius: 50%;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.profile-card__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.profile-card__btns {
  display: flex;
  gap: 10px;
}

.profile-card__tip {
  font-size: 12px;
  color: var(--c-text-muted);
}

/* ===== 表单行 ===== */
.profile-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 14px 0;

  & + & {
    border-top: 1px dashed var(--c-border);
  }
}

.profile-row__label {
  width: 110px;
  flex-shrink: 0;
  padding-top: 9px;
  font-size: 14px;
  color: var(--c-text-secondary);
  text-align: right;
}

.profile-row__control {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  min-width: 0;

  .field-input {
    max-width: 380px;
  }
}

.profile-row__readonly {
  padding: 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.profile-row__desc {
  font-size: 12px;
  color: var(--c-text-muted);
}

/* ===== 分区底部 ===== */
.profile-card__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 8px;
  margin-top: 4px;

  .btn {
    min-width: 140px;
  }
}

.profile-card__success {
  margin: 0;
  font-size: 13px;
  color: var(--c-primary);
}

.profile-card__error {
  margin: 0;
  font-size: 13px;
  color: var(--c-danger);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 720px) {
  .profile-row {
    flex-direction: column;
    gap: 6px;
  }

  .profile-row__label {
    width: auto;
    text-align: left;
    padding-top: 0;
  }

  .profile-card__body {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
