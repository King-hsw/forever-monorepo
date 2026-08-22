<template>
  <form class="composer" novalidate @submit.prevent="submit('published')">
    <!-- 标题：通栏大字输入，像稿纸的标题行 -->
    <div class="card composer__title-block fade-up">
      <input
        id="post-title"
        v-model="form.title"
        class="composer__title-input"
        :class="{ 'is-invalid': !!errors.title }"
        type="text"
        placeholder="在此输入文章标题…"
        @input="errors.title = ''"
      >
      <p v-if="errors.title" class="field-error">{{ errors.title }}</p>
    </div>

    <div class="composer__grid">
      <!-- 正文编辑器：主角 -->
      <div class="card composer__editor fade-up" style="--stagger-index: 1">
        <TiptapEditor
          v-model="form.contentHtml"
          v-model:markdown="form.markdown"
          fluid
        />
      </div>

      <!-- 元信息右栏 -->
      <aside class="composer__rail">
        <div class="card composer__meta fade-up" style="--stagger-index: 2">
          <h3 class="rail-head">发布设置</h3>

          <div class="composer__field">
            <label class="field-label" for="post-category">分类 <em>*</em></label>
            <select
              id="post-category"
              v-model="form.categoryId"
              class="field-input"
              :class="{ 'is-invalid': !!errors.categoryId }"
              @change="errors.categoryId = ''"
            >
              <option :value="null" disabled>请选择分类</option>
              <option v-for="cat in categoriesStore.list" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
            <p v-if="errors.categoryId" class="field-error">{{ errors.categoryId }}</p>
          </div>

          <div class="composer__field">
            <span class="field-label">标签</span>
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
            </div>
          </div>

          <div class="composer__field">
            <label class="field-label" for="post-excerpt">摘要</label>
            <textarea
              id="post-excerpt"
              v-model="form.excerpt"
              class="field-input"
              rows="4"
              placeholder="简要描述这篇文章（列表页展示用）"
            />
          </div>
        </div>

        <div class="card composer__actions fade-up" style="--stagger-index: 3">
          <button type="submit" class="btn btn--primary">保存并发布</button>
          <button type="button" class="btn" @click="submit('draft')">存为草稿</button>
        </div>
      </aside>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { Post, PostInput, PostStatus } from '~/stores/types'

const props = defineProps<{ initial?: Post | null }>()
const emit = defineEmits<{ save: [input: PostInput] }>()

const categoriesStore = useCategoriesStore()
const tagsStore = useTagsStore()

const form = reactive({
  title: props.initial?.title ?? '',
  excerpt: props.initial?.excerpt ?? '',
  categoryId: (props.initial?.categoryId ?? null) as string | null,
  tagIds: [...(props.initial?.tagIds ?? [])],
  contentHtml: props.initial?.contentHtml ?? '',
  markdown: props.initial?.markdown ?? '',
})

const errors = reactive({ title: '', categoryId: '' })

function validate(): boolean {
  let ok = true
  if (!form.title.trim()) {
    errors.title = '标题不能为空'
    ok = false
  }
  if (!form.categoryId) {
    errors.categoryId = '请选择分类'
    ok = false
  }
  return ok
}

function submit(status: PostStatus) {
  if (!validate()) return
  emit('save', {
    title: form.title.trim(),
    excerpt: form.excerpt.trim(),
    contentHtml: form.contentHtml,
    markdown: form.markdown,
    status,
    categoryId: form.categoryId,
    tagIds: [...form.tagIds],
  })
}

function toggleTag(id: string) {
  const idx = form.tagIds.indexOf(id)
  if (idx >= 0) form.tagIds.splice(idx, 1)
  else form.tagIds.push(id)
}
</script>

<style scoped>
.composer__title-block {
  padding: 14px 22px;
}

.composer__title-input {
  width: 100%;
  font-size: 24px;
  font-weight: 700;
  color: var(--c-text);
  background: none;
  border: none;
  outline: none;

  &::placeholder {
    color: var(--c-text-muted);
    font-weight: 500;
  }
}

.field-error {
  margin-top: 4px;
  font-size: 12px;
  color: var(--c-danger);
}

.composer__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: start;
  margin-top: 16px;
}

.composer__editor {
  overflow: hidden;

  :deep(.tiptap-editor .tiptap) {
    min-height: 62vh;
  }
}

.composer__rail {
  position: sticky;
  top: 118px;
  display: grid;
  gap: 16px;
}

.rail-head {
  margin: 0 0 14px;
  padding-bottom: 8px;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--c-text-muted);
  border-bottom: 1px solid var(--c-border);
}

.composer__meta {
  padding: 18px;
}

.composer__field {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }

  em {
    color: var(--c-danger);
    font-style: normal;
  }
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
  background: #f1f3f9;
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

.composer__actions {
  display: grid;
  gap: 10px;
  padding: 16px;

  .btn {
    width: 100%;
    padding-block: 9px;
  }
}

@media (max-width: 960px) {
  .composer__grid {
    grid-template-columns: 1fr;
  }

  .composer__rail {
    position: static;
  }

  .composer__editor :deep(.tiptap-editor .tiptap) {
    min-height: 48vh;
  }

  /* 窄屏时操作按钮固定吸底 */
  .composer__actions {
    order: -1;
  }
}
</style>
