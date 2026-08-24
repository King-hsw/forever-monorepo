<template>
  <form class="composer" novalidate @submit.prevent="submit('PUBLISHED')">
    <div class="composer__grid">
      <!-- 文档纸面：工具栏 → 大标题 → 正文，连成一张「纸」，参考 Notion / Ghost -->
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

      <!-- 设置栏：无边框分区 + 细线分隔，操作置顶 -->
      <aside class="composer__rail">
        <section class="rail-section fade-up">
          <h3 class="rail-label">发布</h3>
          <div class="rail-actions">
            <button type="submit" class="btn btn--primary" :disabled="saving">{{ saving ? '保存中…' : '保存并发布' }}</button>
            <button type="button" class="btn btn--ghost" :disabled="saving" @click="submit('DRAFT')">存为草稿</button>
          </div>
        </section>

        <section class="rail-section fade-up" style="--stagger-index: 1">
          <label class="rail-label" for="post-category">分类</label>
          <select id="post-category" v-model="form.categoryId" class="field-input">
            <option :value="null">未分类</option>
            <option v-for="cat in categoriesStore.list" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>

          <span class="rail-label">标签</span>
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

        <section class="rail-section fade-up" style="--stagger-index: 2">
          <label class="rail-label" for="post-excerpt">摘要</label>
          <textarea
            id="post-excerpt"
            v-model="form.summary"
            class="field-input"
            rows="4"
            placeholder="简要描述这篇文章（留空则自动截取正文前 120 字）"
          />
        </section>
      </aside>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { Post, PostInput, PostStatus } from '#shared/types'

const props = withDefaults(defineProps<{
  initial?: Post | null
  /** 保存请求进行中，禁用提交按钮 */
  saving?: boolean
}>(), { initial: null, saving: false })
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
.composer__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 288px;
  gap: 24px;
  align-items: start;
}

/* ---- 文档纸面：编辑器融入同一张卡片，去掉内部边框 ---- */
.composer__doc {
  overflow: hidden;
  border-radius: 12px;

  /* 编辑器自身的外框/圆角去掉，与纸面融为一体 */
  :deep(.tiptap-editor) {
    border: none;
    border-radius: 0;
    background: transparent;
  }

  :deep(.tiptap-editor .tiptap) {
    min-height: 62vh;
    max-width: 50rem;
    margin-inline: auto;
    padding: 8px 36px 64px;
  }
}

/* 大标题：无边框、通栏大字，像稿纸的标题行 */
.composer__title-block {
  padding: 20px 36px 0;
  border-bottom: none;
}

.composer__title-input {
  width: 100%;
  font-size: 30px;
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

/* ---- 右侧设置栏：无卡片，细线分区 ---- */
.composer__rail {
  position: sticky;
  top: 96px;
  display: flex;
  flex-direction: column;
}

.rail-section {
  padding: 18px 4px;
  border-bottom: 1px solid var(--c-border);
}

.rail-label {
  display: block;
  margin-bottom: 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--c-text-muted);
}

.rail-actions {
  display: grid;
  gap: 8px;

  .btn {
    width: 100%;
    padding-block: 9px;
  }
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

/* 分类与标签两个控件之间拉开一点间距 */
#post-category {
  margin-bottom: 18px;
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

@media (max-width: 960px) {
  .composer__grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .composer__rail {
    position: static;
    /* 窄屏时设置栏（含操作按钮）排到编辑器上方 */
    order: -1;
    border-bottom: 1px solid var(--c-border);

    .rail-section {
      border-bottom: none;
      padding: 10px 0;
    }
  }

  .composer__doc :deep(.tiptap-editor .tiptap) {
    min-height: 48vh;
    padding: 4px 20px 40px;
  }

  .composer__title-block {
    padding: 14px 20px 0;
  }

  .composer__title-input {
    font-size: 24px;
  }
}
</style>
