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
        <span class="settings-group__icon" aria-hidden="true">{{ group.icon }}</span>
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
            <strong>{{ meta(item.key).label }}</strong>
            <code :title="item.key">{{ item.key }}</code>
            <span v-if="!item.value" class="badge badge--draft">默认</span>
            <span v-else-if="isDirty(item.key)" class="badge badge--modified">已修改</span>
          </div>
          <small class="settings-row__desc">{{ item.description }}</small>
        </div>

        <div class="settings-row__control">
          <!-- 布尔型：开关 -->
          <template v-if="meta(item.key).type === 'boolean'">
            <button
              type="button"
              class="switch"
              :class="{ 'is-on': boolValue(item) }"
              role="switch"
              :aria-checked="boolValue(item)"
              :aria-label="meta(item.key).label"
              @click="toggleBool(item)"
            >
              <span class="switch__knob" />
            </button>
            <span class="switch__text">{{ boolValue(item) ? '开启' : '关闭' }}</span>
          </template>

          <!-- 数值型：数字输入 + 单位 -->
          <template v-else-if="meta(item.key).type === 'number'">
            <div class="input-wrap input-wrap--number">
              <input
                v-model="drafts[item.key]"
                class="field-input"
                :class="{ 'is-invalid': !!errors[item.key] }"
                type="number"
                min="0"
                step="1"
                :placeholder="String(meta(item.key).defaultValue ?? '')"
                :aria-label="`${meta(item.key).label}（${meta(item.key).unit ?? ''}）`"
                @input="errors[item.key] = ''"
              >
              <span v-if="meta(item.key).unit" class="input-wrap__unit">{{ meta(item.key).unit }}</span>
            </div>
          </template>

          <!-- 邮箱 / URL / 文本 -->
          <template v-else>
            <div class="input-wrap">
              <input
                v-model="drafts[item.key]"
                class="field-input"
                :class="{ 'is-invalid': !!errors[item.key] }"
                :type="meta(item.key).type === 'email' ? 'email' : 'text'"
                :placeholder="placeholderOf(item)"
                :aria-label="meta(item.key).label"
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
    </section>

    <!-- 底部统一保存 -->
    <footer v-if="settingsStore.list.length" class="settings-page__footer fade-up" style="--stagger-index: 4">
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

definePageMeta({ layout: 'admin' })

useHead({ title: '站点设置 - Forever 后台' })
useState('admin-page-title', () => '站点设置')

/** 配置状态与操作（原 useSettingsStore，仅本页使用，已内联；reactive 使模板中 ref 自动解包） */
const settingsStore = reactive((() => {
  const list = ref<SettingItem[]>([])
  const loading = ref(false)

  /** 拉取全部配置项（value 为空字符串表示未在数据库设置、走 yml 默认值），每次都取最新数据 */
  async function fetch() {
    loading.value = true
    try {
      list.value = await apiFetch<SettingItem[]>('/api/admin/settings')
    }
    finally {
      loading.value = false
    }
  }

  /** 更新单项配置（仅支持已登记的配置键），成功后用返回值替换列表中的旧项 */
  async function update(key: string, value: string): Promise<void> {
    const item = await apiFetch<SettingItem>('/api/admin/settings', {
      method: 'PUT',
      body: { key, value },
    })
    const idx = list.value.findIndex(s => s.key === key)
    if (idx >= 0) list.value[idx] = item
    else list.value.push(item)
  }

  return { list, loading, fetch, update }
})())

await useAsyncData('admin-settings', async () => {
  await settingsStore.fetch()
}, { server: false })

/* ---------- 配置项元数据（与服务端 SiteConfigService 的登记表对应） ---------- */
type SettingType = 'boolean' | 'number' | 'email' | 'url' | 'text'

interface ItemMeta {
  label: string
  type: SettingType
  /** 服务端内置默认值，仅用于占位提示 / 开关初始态 */
  defaultValue?: string
  unit?: string
}

const ITEM_META: Record<string, ItemMeta> = {
  'site.url': { label: '站点地址', type: 'url' },
  'comment.auto-approve': { label: '新评论直接过审', type: 'boolean', defaultValue: 'true' },
  'comment.post-interval-seconds': { label: '同 IP 发表间隔', type: 'number', defaultValue: '10', unit: '秒' },
  'comment.notify-mail': { label: '邮件通知', type: 'boolean', defaultValue: 'false' },
  'comment.owner-email': { label: '站长邮箱', type: 'email' },
  'comment.from-email': { label: '发件人地址', type: 'email', defaultValue: 'noreply@example.com' },
}

const FALLBACK_META: ItemMeta = { label: '', type: 'text' }

function meta(key: string): ItemMeta {
  return ITEM_META[key] ?? FALLBACK_META
}

/* ---------- 分组：相关配置聚合展示 ---------- */
interface Group {
  title: string
  icon: string
  desc?: string
  keys: string[]
}

const KNOWN_GROUPS: Group[] = [
  { title: '站点', icon: '🌐', keys: ['site.url'] },
  {
    title: '评论',
    icon: '💬',
    keys: ['comment.auto-approve', 'comment.post-interval-seconds'],
  },
  {
    title: '评论邮件通知',
    icon: '📧',
    desc: '需已在服务端配置 spring.mail.* SMTP 基础设施，通知失败不影响评论本身',
    keys: ['comment.notify-mail', 'comment.owner-email', 'comment.from-email'],
  },
]

/** 已登记配置按分组排列；未登记的归入「其他」，保证后端新增键也能显示 */
const groups = computed<Group[]>(() => {
  const known = new Set(KNOWN_GROUPS.flatMap(g => g.keys))
  const rest = settingsStore.list.filter(s => !known.has(s.key))
  const list = [...KNOWN_GROUPS]
  if (rest.length) list.push({ title: '其他', icon: '🧩', keys: rest.map(s => s.key) })
  return list
})

function itemsOf(group: Group): SettingItem[] {
  return group.keys
    .map(key => settingsStore.list.find(s => s.key === key))
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
syncDrafts(settingsStore.list)

// 拉取完成后补齐新出现的 key（不覆盖用户正在编辑的草稿）
watch(() => settingsStore.list, (list) => {
  for (const item of list) {
    if (!(item.key in drafts)) drafts[item.key] = item.value
  }
})

function isDirty(key: string) {
  return key in drafts && drafts[key] !== settingsStore.list.find(s => s.key === key)?.value
}

const dirtyKeys = computed(() =>
  settingsStore.list.filter(item => isDirty(item.key)).map(item => item.key),
)

function resetItem(item: SettingItem) {
  drafts[item.key] = item.value
  errors[item.key] = ''
}

function resetDrafts() {
  syncDrafts(settingsStore.list)
}

/* ---------- 各类型控件的读写 ---------- */

/** 开关状态：未设置时展示服务端默认值；value 为空字符串表示「默认」 */
function boolValue(item: SettingItem): boolean {
  const raw = (drafts[item.key] ?? '').trim() || item.value
  if (raw === '') return (meta(item.key).defaultValue ?? 'false') === 'true'
  return raw === 'true'
}

function toggleBool(item: SettingItem) {
  // 关闭→开启写 'true'；开启→关闭写 'false'；从默认态切换时与默认值相反即为目标态
  drafts[item.key] = boolValue(item) ? 'false' : 'true'
  errors[item.key] = ''
}

function placeholderOf(item: SettingItem): string {
  if (item.value) return ''
  if (item.key === 'comment.owner-email') return '未设置，不通知站长'
  const d = meta(item.key).defaultValue
  return d ? `默认 ${d}` : '未设置'
}

/* ---------- 校验（与服务端规则一致，提前拦截） ---------- */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function validate(key: string): string {
  const draft = (drafts[key] ?? '').trim()
  if (draft === '') return '' // 留空 = 恢复默认值
  switch (meta(key).type) {
    case 'number':
      if (!/^\d+$/.test(draft)) return '须为不小于 0 的整数'
      break
    case 'boolean':
      if (draft !== 'true' && draft !== 'false') return '布尔型只接受 true/false'
      break
    case 'email':
      if (!EMAIL_RE.test(draft)) return '邮箱格式不正确'
      break
    case 'url':
      if (!draft.startsWith('http://') && !draft.startsWith('https://')) return '必须以 http:// 或 https:// 开头'
      break
  }
  return ''
}

/* ---------- 批量保存 ---------- */
const saving = ref(false)
const successMsg = ref('')
let successTimer: ReturnType<typeof setTimeout> | null = null

function reportError(err: unknown) {
  alert(err instanceof Error ? err.message : '操作失败')
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
      await settingsStore.update(key, (drafts[key] ?? '').trim())
      savedKeys.push(key)
    }
    successMsg.value = `已保存 ${savedKeys.length} 项配置`
    if (successTimer) clearTimeout(successTimer)
    successTimer = setTimeout(() => (successMsg.value = ''), 3000)
  } catch (err) {
    // 同步已保存成功的项，避免草稿与实际状态不一致
    for (const key of savedKeys) {
      const item = settingsStore.list.find(s => s.key === key)
      if (item) drafts[key] = item.value
    }
    reportError(err)
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

  &.is-dirty .switch:not(.is-on) {
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

/* ===== 开关 ===== */
.switch {
  position: relative;
  width: 42px;
  height: 24px;
  flex-shrink: 0;
  padding: 0;
  background: var(--c-border);
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &.is-on {
    background: var(--c-primary);
  }
}

.switch__knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgb(0 0 0 / 20%);
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.switch.is-on .switch__knob {
  transform: translateX(18px);
}

.switch__text {
  width: 30px;
  font-size: 13px;
  color: var(--c-text-secondary);
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

.field-input.is-invalid {
  border-color: var(--c-danger);
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
