<template>
  <form class="composer" :class="{ 'is-fullscreen': fullscreen }" novalidate @submit.prevent="submit('PUBLISHED')">
    <!-- 粘性操作条：返回 / 状态 / 全屏 / 设置 / 发布，参考 Ghost 顶部发布栏 -->
    <div class="composer__bar fade-up">
      <div class="composer__bar-left">
        <NuxtLink to="/admin/posts" class="btn btn--ghost">← 返回列表</NuxtLink>
        <span v-if="status" class="badge" :class="`badge--${statusClass(status)}`">{{ statusLabel(status) }}</span>
      </div>
      <div class="composer__bar-right">
        <button type="button" class="btn btn--ghost" :title="fullscreen ? '退出全屏 (Esc)' : '全屏专注模式'" @click="toggleFullscreen">
          {{ fullscreen ? '⤢ 退出全屏' : '⛶ 全屏' }}
        </button>
        <button type="button" class="btn btn--ghost" @click="drawerOpen = true">⚙ 设置</button>
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
            <button type="button" aria-label="关闭" @click="drawerOpen = false">✕</button>
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
            <div class="composer__tags">
              <button
                v-for="tag in tagsStore.list"
                :key="tag.id"
                type="button"
                class="tag-option"
                :class="{ 'is-active': form.tagIds.includes(tag.id) }"
                @click="toggleTag(tag.id)"
              >
                {{ tag.name }}
              </button>
              <p v-if="!tagsStore.list.length" class="field-hint">暂无可选标签，可在「分类标签」页新增</p>
            </div>
          </section>

          <section class="drawer-section">
            <label class="drawer-label" for="post-excerpt">摘要</label>
            <textarea
              id="post-excerpt"
              v-model="form.summary"
              class="field-input"
              rows="4"
              placeholder="简要描述这篇文章（留空则自动截取正文前 120 字）"
            />
          </section>
        </aside>
      </Transition>
    </Teleport>
  </form>
</template>

<script setup lang="ts">
import type { Post, PostInput, PostStatus } from '#shared/types'

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

function toggleTag(id: number) {
  const idx = form.tagIds.indexOf(id)
  if (idx >= 0) form.tagIds.splice(idx, 1)
  else form.tagIds.push(id)
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

.field-hint {
  width: 100%;
  margin: 0;
  font-size: 12px;
  color: var(--c-text-muted);
}

.field-input.is-invalid {
  border-color: var(--c-danger);

  &:focus {
    box-shadow: 0 0 0 3px rgb(239 68 68 / 15%);
  }
}

select.field-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5' fill='none' stroke='%23646a73' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.composer__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.tag-option {
  padding: 4px 13px;
  font-size: 13px;
  color: var(--c-text-secondary);
  background: var(--c-bg-soft);
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, transform 0.15s;

  &:hover {
    transform: translateY(-1px);
  }

  &.is-active {
    color: #fff;
    background: var(--c-primary);
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
