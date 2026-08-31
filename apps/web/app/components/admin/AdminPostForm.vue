<template>
  <form class="composer" :class="{ 'is-fullscreen': fullscreen }" novalidate @submit.prevent="submit('PUBLISHED')">
    <!-- 粘性操作条：返回 / 状态 / 全屏 / 设置 / 发布，参考 Ghost 顶部发布栏 -->
    <div class="composer__bar fade-up">
      <div class="composer__bar-left">
        <NuxtLink to="/admin/posts" class="btn btn--ghost"><Icon name="lucide:arrow-left" /> 返回列表</NuxtLink>
        <span v-if="status" class="badge" :class="`badge--${statusClass(status)}`">{{ statusLabel(status) }}</span>
      </div>
      <div class="composer__bar-right">
        <button type="button" class="btn btn--ghost" :title="fullscreen ? '退出全屏 (Esc)' : '全屏专注模式'" @click="toggleFullscreen">
          <Icon :name="fullscreen ? 'lucide:minimize-2' : 'lucide:maximize-2'" /> {{ fullscreen ? '退出全屏' : '全屏' }}
        </button>
        <button type="button" class="btn btn--ghost" @click="drawerOpen = true"><Icon name="lucide:settings" /> 设置</button>
        <button type="button" class="btn btn--ghost" :disabled="saving" @click="submit('DRAFT')">存为草稿</button>
        <button type="submit" class="btn btn--primary" :disabled="saving">{{ saving ? '保存中…' : '保存并发布' }}</button>
      </div>
    </div>

    <!-- 文档纸面：工具栏 → 大标题 → 正文，居中单栏，参考 Notion -->
    <div class="composer__doc fade-up">
      <TiptapEditor v-model="form.contentHtml" v-model:markdown="form.markdown" fluid>
        <template #header>
          <div class="composer__title-block">
            <input
              id="post-title"
              v-model="form.title"
              class="composer__title-input"
              :class="{ 'is-invalid': !!errors.title }"
              type="text"
              placeholder="输入文章标题…"
              @input="errors.title = ''"
            >
            <p v-if="errors.title" class="field-error">{{ errors.title }}</p>
          </div>
        </template>
      </TiptapEditor>
    </div>

    <!-- 设置抽屉：分类 / 标签 / 摘要 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="drawerOpen" class="composer__mask" @click="drawerOpen = false" />
      </Transition>
      <Transition name="slide">
        <aside v-if="drawerOpen" class="composer__drawer">
          <header class="drawer-head">
            <h3>文章设置</h3>
            <button type="button" class="drawer-head__close" aria-label="关闭" @click="drawerOpen = false"><Icon name="lucide:x" /></button>
          </header>

          <section class="drawer-section">
            <label class="drawer-label" for="post-category">分类</label>
            <select id="post-category" v-model="form.categoryId" class="field-input">
              <option :value="null">未分类</option>
              <option v-for="cat in categoriesStore.list" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </section>

          <section class="drawer-section">
            <span class="drawer-label">标签</span>
            <!-- 标签输入框：回车添加，已有标签直接选中、没有的现场创建 -->
            <div class="tag-input" @click="tagInputEl?.focus()">
              <span v-for="tag in selectedTags" :key="tag.id" class="tag-chip">
                {{ tag.name }}
                <button type="button" :aria-label="`移除标签 ${tag.name}`" @click.stop="removeTag(tag.id)">×</button>
              </span>
              <input
                ref="tagInputEl"
                v-model="tagDraft"
                type="text"
                :placeholder="selectedTags.length ? '' : '输入标签，回车添加'"
                @keydown.enter.prevent="addTag"
                @keydown.backspace="onBackspace"
              >
            </div>
            <p v-if="suggestions.length" class="tag-suggest">
              已有：
              <button v-for="s in suggestions" :key="s.id" type="button" @click="selectTag(s)">{{ s.name }}</button>
            </p>
          </section>

          <section class="drawer-section">
            <div class="summary-head">
              <label class="drawer-label" for="post-excerpt">摘要</label>
              <button
                type="button"
                class="summary-ai-btn"
                :disabled="!postId || aiSummaryBusy"
                @click="generateSummary"
              >
                <Icon name="lucide:sparkles" />{{ aiSummaryBusy ? '生成中…' : 'AI 生成' }}
              </button>
            </div>
            <textarea
              id="post-excerpt"
              v-model="form.summary"
              class="field-input"
              rows="4"
              placeholder="简要描述这篇文章（留空则自动截取正文前 120 字）"
            />
            <p v-if="!postId" class="summary-hint">保存文章后即可用 AI 生成摘要</p>
          </section>
        </aside>
      </Transition>
    </Teleport>
  </form>
</template>

<script setup lang="ts">
import type { Post, PostInput, PostStatus, Tag } from '#shared/types'

const props = withDefaults(defineProps<{
  initial?: Post | null
  /** 文章当前状态（编辑页显示状态徽章；新建时不传） */
  status?: PostStatus | null
  /** 保存请求进行中，禁用提交按钮 */
  saving?: boolean
}>(), { initial: null, status: null, saving: false })
const emit = defineEmits<{ save: [input: PostInput, status: PostStatus] }>()

const categoriesStore = useCategoriesStore()
const tagsStore = useTagsStore()

onMounted(() => {
  categoriesStore.fetch()
  tagsStore.fetch()
})

const form = reactive({
  title: props.initial?.title ?? '',
  summary: props.initial?.summary ?? '',
  categoryId: (props.initial?.categoryId ?? null) as number | null,
  tagIds: [...(props.initial?.tags.map(t => t.id) ?? [])],
  // 编辑时后端返回 Markdown 正文，交给 TiptapEditor 的 Markdown 扩展解析渲染
  contentHtml: props.initial?.content ?? '',
  markdown: props.initial?.content ?? '',
})

// 全屏专注模式（与 admin 布局共享：隐藏侧边栏与顶栏）
const fullscreen = useState('admin-editor-fullscreen', () => false)
const drawerOpen = ref(false)

/* ---- AI 摘要：后端按文章 id 生成并落库；新建页保存前无 id，按钮置灰 ---- */
const postsStore = usePostsStore()
const postId = props.initial?.id
const aiSummaryBusy = ref(false)

async function generateSummary() {
  if (!postId || aiSummaryBusy.value) return
  aiSummaryBusy.value = true
  try {
    const post = await postsStore.aiSummary(postId)
    form.summary = post.summary
  } catch (err) {
    alert(errMsg(err, 'AI 摘要生成失败'))
  } finally {
    aiSummaryBusy.value = false
  }
}

function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (drawerOpen.value) drawerOpen.value = false
  else if (fullscreen.value) fullscreen.value = false
}

onMounted(() => window.addEventListener('keydown', onKeydown))
// 离开页面时退出全屏，避免状态残留到其它后台页
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  fullscreen.value = false
})

const errors = reactive({ title: '' })

function validate(): boolean {
  let ok = true
  if (!form.title.trim()) {
    errors.title = '标题不能为空'
    ok = false
  }
  return ok
}

function submit(status: PostStatus) {
  if (!validate()) return
  emit('save', {
    title: form.title.trim(),
    content: form.markdown,
    summary: form.summary.trim() || undefined,
    categoryId: form.categoryId,
    tagIds: [...form.tagIds],
  }, status)
}

/* ---- 标签输入：即输即建 ---- */
const tagDraft = ref('')
const tagInputEl = ref<HTMLInputElement | null>(null)

const selectedTags = computed(() =>
  form.tagIds
    .map(id => tagsStore.list.find(t => t.id === id))
    .filter((t): t is Tag => !!t),
)

// 输入时提示名称匹配的已有标签（排除已选）
const suggestions = computed(() => {
  const q = tagDraft.value.trim().toLowerCase()
  if (!q) return []
  return tagsStore.list
    .filter(t => t.name.toLowerCase().includes(q) && !form.tagIds.includes(t.id))
    .slice(0, 5)
})

async function addTag() {
  const name = tagDraft.value.trim()
  if (!name) return
  try {
    // 已存在则复用，不存在则现场创建
    const existing = tagsStore.list.find(t => t.name === name)
    const tag = existing ?? await tagsStore.create({ name })
    if (!form.tagIds.includes(tag.id)) form.tagIds.push(tag.id)
    tagDraft.value = ''
  } catch (err) {
    alert(errMsg(err, '创建标签失败'))
  }
}

function selectTag(tag: Tag) {
  if (!form.tagIds.includes(tag.id)) form.tagIds.push(tag.id)
  tagDraft.value = ''
  tagInputEl.value?.focus()
}

function removeTag(id: number) {
  form.tagIds.splice(form.tagIds.indexOf(id), 1)
}

/** 输入框为空时按退格删除最后一个标签 */
function onBackspace() {
  if (!tagDraft.value && form.tagIds.length) form.tagIds.pop()
}
</script>

<style scoped>
/* ---- 粘性操作条 ---- */
.composer__bar {
  position: sticky;
  top: 64px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin: -6px -4px 16px;
  padding: 8px 4px;
  background: var(--c-bg);
}

.is-fullscreen .composer__bar {
  top: 0;
}

.composer__bar-left,
.composer__bar-right {
  display: flex;
  align-items: center;
  gap: 8px;

  .btn {
    padding: 5px 12px;
    font-size: 13px;
  }
}

/* ---- 文档纸面：居中单栏 ---- */
.composer__doc {
  max-width: 780px;
  margin-inline: auto;
  overflow: hidden;
  border-radius: 12px;

  /* 编辑器自身的外框去掉，与纸面融为一体 */
  :deep(.tiptap-editor) {
    border: none;
    border-radius: 0;
    background: transparent;
  }

  :deep(.tiptap-editor .tiptap) {
    min-height: 62vh;
    padding: 8px 40px 72px;
  }

  .is-fullscreen & :deep(.tiptap-editor .tiptap) {
    min-height: calc(100vh - 140px);
  }
}

/* 大标题：无边框、通栏大字，像稿纸的标题行 */
.composer__title-block {
  padding: 24px 40px 0;
}

.composer__title-input {
  width: 100%;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--c-text);
  background: none;
  border: none;
  outline: none;
  caret-color: var(--c-primary);

  &::placeholder {
    color: var(--c-text-muted);
    opacity: 0.55;
    font-weight: 600;
  }

  &:focus::placeholder {
    opacity: 0.35;
  }
}

.field-error {
  margin-top: 4px;
  font-size: 12px;
  color: var(--c-danger);
}

/* 标题输入的失效光晕：描边色由全局 .field-input.is-invalid 提供 */
.field-input.is-invalid:focus {
  box-shadow: 0 0 0 3px rgb(239 68 68 / 15%);
}

select.field-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5' fill='none' stroke='%23646a73' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

/* ---- 标签输入框（chip 式，紧凑不占空间） ---- */
.tag-input {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 5px 8px;
  cursor: text;
  background: var(--c-bg-card);
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius-control);

  &:focus-within {
    border-color: var(--c-primary);
  }

  input {
    flex: 1;
    min-width: 7ch;
    font: inherit;
    font-size: 13px;
    color: var(--c-text);
    background: none;
    border: none;
    outline: none;
  }
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 4px 2px 10px;
  font-size: 12.5px;
  color: var(--c-text-secondary);
  background: var(--c-bg-soft);
  border-radius: 999px;

  button {
    display: grid;
    place-items: center;
    width: 16px;
    height: 16px;
    font-size: 13px;
    line-height: 1;
    color: var(--c-text-muted);
    background: none;
    border: none;
    border-radius: 50%;
    cursor: pointer;

    &:hover {
      color: #fff;
      background: var(--c-danger);
    }
  }
}

.tag-suggest {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--c-text-muted);

  button {
    padding: 1px 8px;
    margin-right: 4px;
    font-size: 12px;
    color: var(--c-primary-hover);
    background: var(--c-primary-light);
    border: none;
    border-radius: 999px;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
}

/* ---- 设置抽屉 ---- */
.composer__mask {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgb(0 0 0 / 25%);
}

.composer__drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 80;
  display: flex;
  flex-direction: column;
  width: min(360px, 92vw);
  padding: 20px 22px;
  overflow-y: auto;
  background: var(--c-bg-card);
  box-shadow: -12px 0 32px rgb(0 0 0 / 12%);
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;

  h3 {
    margin: 0;
    font-size: 15px;
    color: var(--c-text);
  }

  button {
    width: 28px;
    height: 28px;
    font-size: 14px;
    color: var(--c-text-muted);
    background: none;
    border: none;
    border-radius: 50%;
    cursor: pointer;

    &:hover {
      color: var(--c-text);
      background: var(--c-bg-soft);
    }
  }
}

.drawer-section {
  padding: 16px 0;
  border-bottom: 1px solid var(--c-border);

  &:last-child {
    border-bottom: none;
  }
}

.drawer-label {
  display: block;
  margin-bottom: 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--c-text-muted);
}

/* 摘要区头部：label 与 AI 生成按钮同行 */
.summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;

  .drawer-label {
    margin-bottom: 0;
  }
}

.summary-ai-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  font-size: 12px;
  color: var(--c-primary-hover);
  background: var(--c-primary-light);
  border: none;
  border-radius: 999px;
  cursor: pointer;

  &:disabled {
    color: var(--c-text-muted);
    background: var(--c-bg-soft);
    cursor: default;
  }
}

.summary-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--c-text-muted);
}

/* 抽屉过渡 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.22s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

@media (max-width: 720px) {
  .composer__bar {
    top: 56px;
  }

  .composer__bar-left,
  .composer__bar-right {
    .btn {
      padding: 4px 10px;
      font-size: 12px;
    }
  }

  .composer__doc {
    :deep(.tiptap-editor .tiptap) {
      min-height: 48vh;
      padding: 4px 20px 48px;
    }
  }

  .composer__title-block {
    padding: 16px 20px 0;
  }

  .composer__title-input {
    font-size: 24px;
  }
}
</style>
