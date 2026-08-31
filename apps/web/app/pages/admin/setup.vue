<template>
  <div class="setup-page">
    <header class="setup-page__header fade-up">
      <h2>初始化引导</h2>
      <p>
        新环境建议依次确认以下系统参数；已落库的项会自动带出，留空表示走服务端默认值。
        随时可以在「站点设置」中回来修改。
      </p>
    </header>

    <!-- 步骤指示器 -->
    <ol v-if="steps.length" class="setup-steps fade-up" style="--stagger-index: 1">
      <li
        v-for="(step, i) in steps"
        :key="step.title"
        :class="{ 'is-active': i === current, 'is-done': i < current }"
        :aria-current="i === current ? 'step' : undefined"
      >
        <span class="setup-steps__dot">
          <Icon v-if="i < current" name="lucide:check" /><template v-else>{{ i + 1 }}</template>
        </span>
        <span class="setup-steps__label">{{ step.title }}</span>
      </li>
    </ol>

    <!-- 当前步骤表单 -->
    <section v-if="step" class="card setup-card fade-up" style="--stagger-index: 2">
      <header class="setup-card__head">
        <span class="setup-card__icon" aria-hidden="true"><Icon :name="step.icon" /></span>
        <div>
          <h3>{{ step.title }}</h3>
          <small v-if="step.desc">{{ step.desc }}</small>
        </div>
      </header>

      <div v-for="item in itemsOf(step)" :key="item.key" class="setup-row">
        <div class="setup-row__info">
          <strong>{{ metaOf(item.key).label || item.key }}</strong>
          <small>{{ item.description }}</small>
        </div>
        <div class="setup-row__control">
          <!-- 布尔型开关 -->
          <AdminSettingSwitch
            v-if="metaOf(item.key).type === 'boolean'"
            :on="settingBoolValue(drafts[item.key], item)"
            :label="metaOf(item.key).label"
            @toggle="drafts[item.key] = settingBoolValue(drafts[item.key], item) ? 'false' : 'true'"
          />

          <!-- 数值 / 文本 / URL / 邮箱 -->
          <input
            v-else
            v-model="drafts[item.key]"
            class="field-input"
            :type="metaOf(item.key).type === 'number' ? 'number' : metaOf(item.key).type === 'email' ? 'email' : 'text'"
            min="0"
            :placeholder="settingPlaceholder(item)"
            :aria-label="metaOf(item.key).label"
            spellcheck="false"
          >
        </div>
      </div>

      <p v-if="stepError" class="field-error">{{ stepError }}</p>

      <footer class="setup-card__actions">
        <button v-if="current > 0" type="button" class="btn" @click="current--">上一步</button>
        <button type="button" class="btn" @click="next()">
          {{ current === steps.length - 1 ? '完成' : '跳过' }}
        </button>
        <button type="button" class="btn btn--primary" :disabled="saving" @click="saveStep">
          {{ saving ? '保存中…' : current === steps.length - 1 ? '保存并完成' : '保存并下一步' }}
        </button>
      </footer>
    </section>

    <!-- 完成态 -->
    <section v-if="done" class="card setup-done fade-up" style="--stagger-index: 2">
      <span class="setup-done__icon" aria-hidden="true"><Icon name="lucide:party-popper" /></span>
      <h3>初始化完成</h3>
      <p>所有参数已保存，可以开始使用了。</p>
      <footer>
        <NuxtLink to="/admin/settings" class="btn">前往站点设置</NuxtLink>
        <NuxtLink to="/admin" class="btn btn--primary">回到仪表盘</NuxtLink>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { SettingItem } from '#shared/types'
import { apiFetch } from '~/utils/api'

definePageMeta({ layout: 'admin' })

useAdminPage('初始化引导')

/* ---------- 引导步骤 ---------- */
interface Step {
  title: string
  icon: string
  desc?: string
  keys: string[]
}

const steps: Step[] = [
  { title: '站点信息', icon: 'lucide:globe', desc: '站点对外展示的访问地址，用于 RSS、友链等场景', keys: ['site.url'] },
  { title: '留言板', icon: 'lucide:clipboard-list', keys: ['board.title', 'board.summary'] },
  { title: '评论规则', icon: 'lucide:message-circle', keys: ['comment.auto-approve', 'comment.post-interval-seconds'] },
  {
    title: '邮件通知（可选）',
    icon: 'lucide:mail',
    desc: 'SMTP 账号在「站点设置 → 评论邮件通知」分组配置；未配置时邮件通知保持关闭',
    keys: ['comment.notify-mail', 'comment.owner-email', 'comment.from-email'],
  },
]

const settings = ref<SettingItem[]>([])
const current = ref(0)
const done = ref(false)
const saving = ref(false)
const stepError = ref('')

const drafts = reactive<Record<string, string>>({})

await useAsyncData('admin-setup', async () => {
  settings.value = await apiFetch<SettingItem[]>('/api/admin/settings')
  for (const item of settings.value) drafts[item.key] = item.value
}, { server: false })

const step = computed(() => steps[current.value] ?? null)

function itemsOf(s: Step): SettingItem[] {
  return s.keys
    .map(key => settings.value.find(x => x.key === key))
    .filter((x): x is SettingItem => !!x)
}

/* ---------- 校验 + 保存 ---------- */

function validate(item: SettingItem): string {
  const draft = String(drafts[item.key] ?? '').trim()
  if (draft === '') return '' // 留空 = 走默认值
  switch (metaOf(item.key).type) {
    case 'number':
      if (!/^\d+$/.test(draft)) return `${metaOf(item.key).label}：须为不小于 0 的整数`
      break
    case 'email':
      if (!EMAIL_RE.test(draft)) return `${metaOf(item.key).label}：邮箱格式不正确`
      break
    case 'url':
      if (!isHttpUrl(draft)) return '站点地址必须以 http:// 或 https:// 开头'
      break
    case 'boolean':
      if (draft !== 'true' && draft !== 'false') return `${metaOf(item.key).label}：只接受 true/false`
      break
  }
  return ''
}

async function saveStep() {
  const items = step.value ? itemsOf(step.value) : []
  for (const item of items) {
    const err = validate(item)
    if (err) {
      stepError.value = err
      return
    }
  }
  stepError.value = ''
  const changed = items.filter(item => String(drafts[item.key] ?? '').trim() !== item.value)
  saving.value = true
  try {
    for (const item of changed) {
      await apiFetch<SettingItem>('/api/admin/settings', {
        method: 'PUT',
        body: { key: item.key, value: String(drafts[item.key]).trim() },
      })
    }
    next()
  } catch (err) {
    stepError.value = errMsg(err, '保存失败')
  } finally {
    saving.value = false
  }
}

/** 下一步；最后一步进入完成态 */
function next() {
  if (current.value < steps.length - 1) current.value++
  else done.value = true
}
</script>

<style scoped>
.setup-page {
  max-width: 640px;
}

.setup-page__header {
  margin-bottom: 20px;

  h2 {
    margin: 0 0 6px;
    font-size: 18px;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.7;
    color: var(--c-text-secondary);
  }
}

.setup-steps {
  display: flex;
  gap: 4px;
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
}

.setup-steps li {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 12px;
  color: var(--c-text-muted);

  &:not(:last-child)::after {
    content: '';
    flex: 1;
    height: 1px;
    margin: 0 6px;
    background: var(--c-border);
  }

  &.is-active {
    color: var(--c-primary);
    font-weight: 600;
  }

  &.is-done {
    color: var(--c-text-secondary);
  }
}

.setup-steps__dot {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  font-size: 11px;
  background: var(--c-bg-soft);
  border-radius: 50%;

  .is-active & {
    color: var(--c-on-primary);
    background: var(--c-primary);
  }

  .is-done & {
    color: var(--c-primary);
    background: var(--c-primary-light);
  }
}

.setup-steps__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.setup-card,
.setup-done {
  padding: 24px;
}

.setup-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  font-size: 20px;

  h3 {
    margin: 0;
    font-size: 15px;
  }

  small {
    display: block;
    font-size: 12px;
    color: var(--c-text-muted);
  }
}

.setup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;

  & + & {
    border-top: 1px solid var(--c-border);
  }
}

.setup-row__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  strong {
    font-size: 13px;
  }

  small {
    font-size: 12px;
    line-height: 1.5;
    color: var(--c-text-muted);
  }
}

.setup-row__control {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;

  input.field-input {
    width: 220px;
  }
}

.setup-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;

  .btn {
    min-width: 90px;
    padding-block: 7px;
  }
}

.setup-done {
  text-align: center;

  span {
    font-size: 36px;
  }

  h3 {
    margin: 10px 0 4px;
    font-size: 16px;
  }

  p {
    margin: 0 0 18px;
    font-size: 13px;
    color: var(--c-text-muted);
  }

  footer {
    display: flex;
    justify-content: center;
    gap: 10px;
  }
}
</style>
