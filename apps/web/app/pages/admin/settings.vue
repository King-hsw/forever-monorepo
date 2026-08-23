<template>
  <div class="settings-page">
    <header class="settings-page__header fade-up">
      <p class="settings-page__hint">
        值为空的配置项表示未自定义、走后端 yml 默认值；数值型配置须为非负整数。共
        {{ settingsStore.list.length }} 项，已修改 {{ dirtyKeys.length }} 项
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

    <!-- 配置列表 -->
    <div class="card settings-list fade-up" style="--stagger-index: 1">
      <div
        v-for="(item, i) in settingsStore.list"
        :key="item.key"
        class="settings-list__row"
        :class="{ 'is-dirty': isDirty(item.key) }"
        :style="{ '--stagger-index': i + 2 }"
      >
        <div class="settings-list__info">
          <div class="settings-list__key">
            <code>{{ item.key }}</code>
            <span v-if="!item.value" class="badge badge--draft">默认值（未自定义）</span>
            <span v-else-if="isDirty(item.key)" class="badge badge--modified">已修改</span>
          </div>
          <small class="settings-list__desc">{{ item.description }}</small>
        </div>

        <div class="settings-list__editor">
          <input
            v-model="drafts[item.key]"
            class="field-input"
            :class="{ 'is-invalid': !!errors[item.key] }"
            type="text"
            :placeholder="item.value ? '' : '未设置，走默认值'"
            :aria-label="`配置项 ${item.key}`"
            @input="errors[item.key] = ''"
          >
          <p v-if="errors[item.key]" class="field-error">{{ errors[item.key] }}</p>
          <button
            v-if="isDirty(item.key)"
            type="button"
            class="settings-list__reset"
            @click="resetItem(item)"
          >还原</button>
        </div>
      </div>

      <p v-if="!settingsStore.list.length && !settingsStore.loading" class="settings-list__empty">
        暂无配置项
      </p>
    </div>

    <!-- 底部统一保存 -->
    <footer v-if="settingsStore.list.length" class="settings-page__footer fade-up" style="--stagger-index: 3">
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
import type { SettingItem } from '~/stores/types'

definePageMeta({ layout: 'admin' })

useHead({ title: '站点设置 - Forever 后台' })
useState('admin-page-title', () => '站点设置')

const settingsStore = useSettingsStore()

// 仅客户端拉取：登录令牌存在 localStorage，SSR 阶段拿不到（避免直接访问 URL 时 SSR 401 失败）
await useAsyncData('admin-settings', async () => {
  await settingsStore.fetch(true)
}, { server: false })

/* ---------- 编辑草稿 ---------- */
/** key -> 输入框中的值；以 store 列表为基准做脏检查 */
const drafts = reactive<Record<string, string>>({})
const errors = reactive<Record<string, string>>({})

function syncDrafts(items: SettingItem[]) {
  for (const item of items) {
    drafts[item.key] = item.value
    errors[item.key] = ''
  }
}
syncDrafts(settingsStore.list)

// 拉取完成后（异步）同步一次草稿
watch(() => settingsStore.list, (list) => {
  for (const item of list) {
    if (!(item.key in drafts)) drafts[item.key] = item.value
  }
})

function resetItem(item: SettingItem) {
  drafts[item.key] = item.value
  errors[item.key] = ''
}

function resetDrafts() {
  syncDrafts(settingsStore.list)
}

function isDirty(key: string) {
  return key in drafts && drafts[key] !== settingsStore.list.find(s => s.key === key)?.value
}

const dirtyKeys = computed(() =>
  settingsStore.list.filter(item => isDirty(item.key)).map(item => item.key),
)

/* ---------- 数值型配置校验 ----------
 * 后端仅对登记为数值型的键要求「>= 0 的整数」；
 * 前端按键名特征（MAX / LIMIT / DAYS / TIMEOUT 等词元）识别并先行校验。
 */
const NUMERIC_TOKENS = [
  'MAX', 'MIN', 'LIMIT', 'SIZE', 'COUNT', 'NUM', 'NUMBER',
  'DAYS', 'HOURS', 'MINUTES', 'SECONDS', 'TIMEOUT',
  'INTERVAL', 'THRESHOLD', 'RETRIES', 'PORT', 'LENGTH',
]

function isNumericKey(key: string): boolean {
  // camelCase / PascalCase 归一化为下划线分隔后按词元匹配
  const tokens = key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase()
    .split('_')
  return tokens.some(t => NUMERIC_TOKENS.includes(t))
}

function validate(key: string): string {
  const draft = (drafts[key] ?? '').trim()
  if (draft === '') return '' // 留空 = 恢复默认值
  if (isNumericKey(key) && !/^\d+$/.test(draft)) {
    return '该项为数值型配置，须为不小于 0 的整数'
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

.settings-list {
  padding: 6px 20px;
}

.settings-list__row {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 14px 0;

  & + & {
    border-top: 1px solid var(--c-border);
  }

  &.is-dirty .field-input {
    border-color: var(--c-primary);
  }
}

.settings-list__info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.settings-list__key {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  code {
    padding: 1px 8px;
    font-size: 12.5px;
    color: var(--c-primary);
    background: var(--c-primary-light);
    border-radius: 6px;
  }
}

.badge--modified {
  color: var(--c-primary);
  background: rgb(59 130 246 / 10%);
}

.settings-list__desc {
  font-size: 12px;
  line-height: 1.6;
  color: var(--c-text-muted);
}

.settings-list__editor {
  position: relative;
  width: 320px;
  flex-shrink: 0;

  .field-input {
    width: 100%;
  }

  .field-error {
    margin-top: 4px;
  }
}

.settings-list__reset {
  position: absolute;
  top: 7px;
  right: 8px;
  padding: 1px 6px;
  font-size: 11.5px;
  color: var(--c-text-muted);
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.15s;

  &:hover {
    color: var(--c-danger);
  }
}

.settings-list__empty {
  width: 100%;
  padding: 24px 0;
  font-size: 13px;
  color: var(--c-text-muted);
  text-align: center;
}

.field-input.is-invalid {
  border-color: var(--c-danger);
}

.settings-page__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;

  .btn {
    min-width: 140px;
  }
}

@media (max-width: 720px) {
  .settings-list__row {
    flex-direction: column;
    gap: 10px;
  }

  .settings-list__editor {
    width: 100%;
  }

  .settings-page__header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
