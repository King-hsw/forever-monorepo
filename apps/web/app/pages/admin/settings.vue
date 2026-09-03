<template>
  <div class="settings-page">
    <header class="settings-page__header fade-up">
      <p class="settings-page__hint">
        修改落库并即时生效，重启不丢；带「默认」标记的项走服务端内置值。已修改
        {{ dirtyKeys.length }} 项
      </p>
      <button
        v-if="dirtyKeys.length"
        type="button"
        class="btn"
        @click="resetDrafts"
      >放弃修改</button>
    </header>

    <!-- 保存结果反馈 -->
    <Transition name="toast">
      <p v-if="successMsg" class="settings-page__success fade-up" role="status">{{ successMsg }}</p>
    </Transition>

    <!-- 分组卡片 -->
    <section
      v-for="(group, gi) in groups"
      :key="group.title"
      class="card settings-group fade-up"
      :style="{ '--stagger-index': gi + 1 }"
    >
      <header class="settings-group__head">
        <span class="settings-group__icon" aria-hidden="true"><Icon :name="group.icon" /></span>
        <div>
          <h3>{{ group.title }}</h3>
          <small v-if="group.desc">{{ group.desc }}</small>
        </div>
      </header>

      <div
        v-for="item in itemsOf(group)"
        :key="item.key"
        class="settings-row"
        :class="{ 'is-dirty': isDirty(item.key) }"
      >
        <div class="settings-row__info">
          <div class="settings-row__label">
            <strong>{{ metaOf(item.key).label }}</strong>
            <code :title="item.key">{{ item.key }}</code>
            <span v-if="!item.value" class="badge badge--draft">默认</span>
            <span v-else-if="isDirty(item.key)" class="badge badge--modified">已修改</span>
          </div>
          <small class="settings-row__desc">{{ item.description }}</small>
        </div>

        <div class="settings-row__control">
          <!-- 布尔型：开关 -->
          <template v-if="metaOf(item.key).type === 'boolean'">
            <AdminSettingSwitch
              :on="settingBoolValue(drafts[item.key], item)"
              :label="metaOf(item.key).label"
              @toggle="toggleBool(item)"
            />
          </template>

          <!-- 数值型：数字输入 + 单位 -->
          <template v-else-if="metaOf(item.key).type === 'number'">
            <div class="input-wrap input-wrap--number">
              <input
                v-model="drafts[item.key]"
                class="field-input"
                :class="{ 'is-invalid': !!errors[item.key] }"
                type="number"
                min="0"
                step="1"
                :placeholder="String(metaOf(item.key).defaultValue ?? '')"
                :aria-label="`${metaOf(item.key).label}（${metaOf(item.key).unit ?? ''}）`"
                @input="errors[item.key] = ''"
              >
              <span v-if="metaOf(item.key).unit" class="input-wrap__unit">{{ metaOf(item.key).unit }}</span>
            </div>
          </template>

          <!-- 邮箱 / URL / 文本 -->
          <template v-else>
            <div class="input-wrap">
              <input
                v-model="drafts[item.key]"
                class="field-input"
                :class="{ 'is-invalid': !!errors[item.key] }"
                :type="metaOf(item.key).type === 'email' ? 'email'
                  : metaOf(item.key).type === 'date' ? 'date'
                  : metaOf(item.key).type === 'password' ? 'password' : 'text'"
                :placeholder="settingPlaceholder(item)"
                :aria-label="metaOf(item.key).label"
                spellcheck="false"
                @input="errors[item.key] = ''"
              >
            </div>
          </template>

          <p v-if="errors[item.key]" class="field-error">{{ errors[item.key] }}</p>

          <button
            v-if="isDirty(item.key)"
            type="button"
            class="settings-row__reset"
            @click="resetItem(item)"
          >还原</button>
        </div>
      </div>

      <!-- 邮件组：测试发送（验证 SMTP 账密与发件人地址） -->
      <div v-if="group.title === '评论邮件通知'" class="mail-test">
        <button type="button" class="btn" :disabled="testingMail" @click="sendTestMail">
          {{ testingMail ? '发送中…' : '发送测试邮件（至站长邮箱）' }}
        </button>
        <p v-if="mailTestMsg" class="mail-test__msg" :class="{ 'is-ok': mailTestOk }" role="status">
          {{ mailTestMsg }}
        </p>
      </div>
    </section>

    <!-- 底部统一保存 -->
    <footer v-if="list.length" class="settings-page__footer fade-up" style="--stagger-index: 4">
      <button
        type="button"
        class="btn btn--primary"
        :disabled="saving || !dirtyKeys.length"
        @click="saveAll"
      >
        {{ saving ? '保存中…' : dirtyKeys.length ? `保存修改（${dirtyKeys.length}）` : '暂无修改' }}
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { SettingItem } from '#shared/types'
import { apiFetch } from '~/utils/api'

definePageMeta({ layout: 'admin', permission: 'setting:list' })

useAdminPage('站点设置')

/** 配置列表与更新（仅本页使用） */
const list = ref<SettingItem[]>([])

/** 拉取全部配置项（value 为空字符串表示未在数据库设置、走 yml 默认值），每次都取最新数据 */
async function fetchSettings() {
  list.value = await apiFetch<SettingItem[]>('/api/admin/settings')
}

/** 更新单项配置（仅支持已登记的配置键），成功后用返回值替换列表中的旧项 */
async function updateSetting(key: string, value: string): Promise<void> {
  const item = await apiFetch<SettingItem>('/api/admin/settings', {
    method: 'PUT',
    body: { key, value },
  })
  const idx = list.value.findIndex(s => s.key === key)
  if (idx >= 0) list.value[idx] = item
  else list.value.push(item)
}

await useAsyncData('admin-settings', async () => {
  await fetchSettings()
}, { server: false })

/* ---------- 分组：相关配置聚合展示 ---------- */
interface Group {
  title: string
  icon: string
  desc?: string
  keys: string[]
}

const KNOWN_GROUPS: Group[] = [
  { title: '站点', icon: 'lucide:globe', keys: ['site.name', 'site.url', 'site.birth-date'] },
  {
    title: '留言板',
    icon: 'lucide:clipboard-list',
    keys: ['board.title', 'board.summary'],
  },
  {
    title: '评论',
    icon: 'lucide:message-circle',
    keys: ['comment.auto-approve', 'comment.post-interval-seconds'],
  },
  {
    title: '评论邮件通知',
    icon: 'lucide:mail',
    desc: '通知失败不影响评论本身；SMTP 服务器地址留空视为未配置、不发信',
    keys: [
      'comment.notify-mail',
      'mail.host',
      'mail.port',
      'mail.username',
      'mail.password',
      'mail.ssl',
      'comment.owner-email',
      'comment.from-email',
    ],
  },
  {
    title: '动态',
    icon: 'lucide:map-pin',
    desc: '发布页「获取当前位置」走高德逆地理编码；留空时该功能静默降级，可手动填写地点',
    keys: ['moments.amapKey'],
  },
  {
    title: 'AI 概要',
    icon: 'lucide:sparkles',
    desc: '文章 AI 摘要走 OpenAI 兼容接口；总开关打开且 API Key 已配置才会生效',
    keys: ['ai.summary-enabled', 'ai.api-key', 'ai.base-url', 'ai.model'],
  },
]

/** 已登记配置按分组排列；未登记的归入「其他」，保证后端新增键也能显示 */
const groups = computed<Group[]>(() => {
  const known = new Set(KNOWN_GROUPS.flatMap(g => g.keys))
  const rest = list.value.filter(s => !known.has(s.key))
  const all = [...KNOWN_GROUPS]
  if (rest.length) all.push({ title: '其他', icon: 'lucide:puzzle', keys: rest.map(s => s.key) })
  return all
})

function itemsOf(group: Group): SettingItem[] {
  return group.keys
    .map(key => list.value.find(s => s.key === key))
    .filter((s): s is SettingItem => !!s)
}

/* ---------- 编辑草稿 ---------- */
const drafts = reactive<Record<string, string>>({})
const errors = reactive<Record<string, string>>({})

function syncDrafts(items: SettingItem[]) {
  for (const item of items) {
    drafts[item.key] = item.value
    errors[item.key] = ''
  }
}
syncDrafts(list.value)

// 拉取完成后补齐新出现的 key（不覆盖用户正在编辑的草稿）
watch(list, (items) => {
  for (const item of items) {
    if (!(item.key in drafts)) drafts[item.key] = item.value
  }
})

/* ---------- 邮件测试发送 ---------- */
const testingMail = ref(false)
const mailTestMsg = ref('')
const mailTestOk = ref(false)

/** 向站长邮箱发测试邮件（取草稿值，未保存也能先试发） */
async function sendTestMail() {
  const to = String(drafts['comment.owner-email'] ?? '').trim()
  mailTestOk.value = false
  if (!to) {
    mailTestMsg.value = '请先填写站长邮箱'
    return
  }
  testingMail.value = true
  mailTestMsg.value = ''
  try {
    await apiFetch('/api/admin/settings/mail/test', { method: 'POST', body: { to } })
    mailTestOk.value = true
    mailTestMsg.value = `已发送测试邮件至 ${to}`
  } catch (err) {
    mailTestMsg.value = errMsg(err)
  } finally {
    testingMail.value = false
  }
}

function isDirty(key: string) {
  return key in drafts && drafts[key] !== list.value.find(s => s.key === key)?.value
}

const dirtyKeys = computed(() =>
  list.value.filter(item => isDirty(item.key)).map(item => item.key),
)

function resetItem(item: SettingItem) {
  drafts[item.key] = item.value
  errors[item.key] = ''
}

function resetDrafts() {
  syncDrafts(list.value)
}

/* ---------- 各类型控件的读写 ---------- */

function toggleBool(item: SettingItem) {
  // 关闭→开启写 'true'；开启→关闭写 'false'；从默认态切换时与默认值相反即为目标态
  drafts[item.key] = settingBoolValue(drafts[item.key], item) ? 'false' : 'true'
  errors[item.key] = ''
}

/* ---------- 校验（与服务端规则一致，提前拦截） ---------- */

function validate(key: string): string {
  // 数字输入框的 v-model 会把草稿转成 number，统一转回字符串再处理
  const draft = String(drafts[key] ?? '').trim()
  if (draft === '') return '' // 留空 = 恢复默认值
  switch (metaOf(key).type) {
    case 'number':
      if (!/^\d+$/.test(draft)) return '须为不小于 0 的整数'
      break
    case 'date':
      if (!/^\d{4}-\d{2}-\d{2}$/.test(draft) || Number.isNaN(Date.parse(draft))) return '格式须为 yyyy-MM-dd'
      break
    case 'boolean':
      if (draft !== 'true' && draft !== 'false') return '布尔型只接受 true/false'
      break
    case 'email':
      if (!EMAIL_RE.test(draft)) return '邮箱格式不正确'
      break
    case 'url':
      if (!isHttpUrl(draft)) return '必须以 http:// 或 https:// 开头'
      break
  }
  return ''
}

/* ---------- 批量保存 ---------- */
const saving = ref(false)
const successMsg = ref('')
let successTimer: ReturnType<typeof setTimeout> | null = null

/** 把已保存项的草稿回写为列表里的字符串值 */
function syncSaved(keys: string[]) {
  for (const key of keys) {
    const item = list.value.find(s => s.key === key)
    if (item) drafts[key] = item.value
  }
}

async function saveAll() {
  const targets = dirtyKeys.value
  for (const key of targets) {
    errors[key] = validate(key)
  }
  if (targets.some(key => errors[key])) return

  saving.value = true
  const savedKeys: string[] = []
  try {
    // 逐项提交；某项失败时中断，但保留前面已成功项的同步
    for (const key of targets) {
      await updateSetting(key, String(drafts[key] ?? '').trim())
      savedKeys.push(key)
    }
    // 回写字符串草稿，避免数字输入的 number 草稿与列表值不等而一直显示「已修改」
    syncSaved(savedKeys)
    successMsg.value = `已保存 ${savedKeys.length} 项配置`
    if (successTimer) clearTimeout(successTimer)
    successTimer = setTimeout(() => (successMsg.value = ''), 3000)
  } catch (err) {
    syncSaved(savedKeys)
    alert(errMsg(err))
  } finally {
    saving.value = false
  }
}

onBeforeUnmount(() => {
  if (successTimer) clearTimeout(successTimer)
})
</script>

<style scoped>
.settings-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.settings-page__hint {
  margin: 0;
  font-size: 13px;
  color: var(--c-text-muted);
}

.settings-page__success {
  margin: 0 0 12px;
  padding: 9px 14px;
  font-size: 13px;
  color: var(--c-primary);
  background: var(--c-primary-light);
  border-radius: var(--radius-control);
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

/* ===== 分组卡片 ===== */
.settings-group {
  margin-bottom: 18px;
  padding: 18px 20px 6px;
}

.settings-group__head {
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

.settings-group__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  font-size: 19px;
  background: var(--c-bg-soft);
  border-radius: 12px;
}

/* ===== 配置行 ===== */
.settings-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 15px 0;

  & + & {
    border-top: 1px dashed var(--c-border);
  }

  &.is-dirty .field-input {
    border-color: var(--c-primary);
  }

  /* 开关在子组件内，需 :deep 穿透 */
  &.is-dirty :deep(.switch:not(.is-on)) {
    background: var(--c-primary);
  }
}

.settings-row__info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.settings-row__label {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  strong {
    font-size: 14px;
  }

  code {
    padding: 1px 8px;
    font-size: 11.5px;
    font-weight: normal;
    color: var(--c-text-muted);
    background: var(--c-bg-soft);
    border-radius: 6px;
  }
}

.badge--modified {
  color: var(--c-primary);
  background: rgb(59 130 246 / 10%);
}

.settings-row__desc {
  font-size: 12px;
  line-height: 1.6;
  color: var(--c-text-muted);
}

/* ===== 控件区 ===== */
.settings-row__control {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  width: 300px;

  .field-error {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
  }
}

.input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;

  .field-input {
    width: 100%;
  }

  &.input-wrap--number .field-input {
    padding-right: 44px;
  }
}

.input-wrap__unit {
  position: absolute;
  top: 50%;
  right: 12px;
  font-size: 12px;
  color: var(--c-text-muted);
  transform: translateY(-50%);
  pointer-events: none;
}

.settings-row__reset {
  padding: 2px 8px;
  font-size: 11.5px;
  color: var(--c-text-muted);
  background: none;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;

  &:hover {
    color: var(--c-danger);
    border-color: var(--c-danger);
  }
}

/* ===== 邮件测试发送 ===== */
.mail-test {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 0 6px;
}

.mail-test__msg {
  margin: 0;
  font-size: 12.5px;
  color: var(--c-danger);

  &.is-ok {
    color: var(--c-primary);
  }
}

/* ===== 底部保存 ===== */
.settings-page__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;

  .btn {
    min-width: 140px;
  }
}

@media (max-width: 720px) {
  .settings-row {
    flex-direction: column;
    gap: 10px;
  }

  .settings-row__control {
    width: 100%;
    align-self: stretch;
  }

  .settings-page__header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
