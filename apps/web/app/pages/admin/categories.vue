<template>
  <div class="cats-page">
    <!-- Tab 头 -->
    <header class="cats-page__header fade-up">
      <div class="tabs">
        <button
          type="button"
          class="tabs__btn"
          :class="{ 'is-active': tab === 'cats' }"
          @click="tab = 'cats'"
        >
          分类（{{ categoriesStore.list.length }}）
        </button>
        <button
          type="button"
          class="tabs__btn"
          :class="{ 'is-active': tab === 'tags' }"
          @click="tab = 'tags'"
        >
          标签（{{ tagsStore.list.length }}）
        </button>
        <span class="tabs__indicator" :class="{ 'is-right': tab === 'tags' }" />
      </div>
      <button type="button" class="btn btn--primary" @click="tab === 'cats' ? openCatCreate() : openTagCreate()">
        ＋ 新增{{ tab === 'cats' ? '分类' : '标签' }}
      </button>
    </header>

    <!-- ===== 分类 Tab ===== -->
    <template v-if="tab === 'cats'">
      <div v-if="catFormOpen" class="card cats-form fade-up" style="--stagger-index: 1">
        <h3>{{ editingCatId ? '编辑分类' : '新增分类' }}</h3>
        <div class="cats-form__row">
          <div>
            <label class="field-label" for="cat-name">名称 <em>*</em></label>
            <input
              id="cat-name"
              v-model="catForm.name"
              class="field-input"
              :class="{ 'is-invalid': !!catErrors.name }"
              type="text"
              placeholder="如：前端开发"
              @input="catErrors.name = ''"
            >
            <p v-if="catErrors.name" class="field-error">{{ catErrors.name }}</p>
          </div>
          <div>
            <label class="field-label" for="cat-slug">Slug</label>
            <input
              id="cat-slug"
              v-model="catForm.slug"
              class="field-input"
              type="text"
              placeholder="留空自动生成"
            >
          </div>
        </div>
        <div>
          <label class="field-label" for="cat-sort">排序</label>
          <input
            id="cat-sort"
            v-model.number="catForm.sort"
            class="field-input"
            type="number"
            placeholder="越小越靠前，默认 0"
          >
        </div>
        <footer class="cats-form__actions">
          <button type="button" class="btn" @click="cancelCatForm">取消</button>
          <button type="button" class="btn btn--primary" :disabled="saving" @click="saveCatForm">
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </footer>
      </div>

      <div class="card cats-list fade-up" style="--stagger-index: 2">
        <div
          v-for="(cat, i) in categoriesStore.list"
          :key="cat.id"
          class="cats-list__row"
          :style="{ '--stagger-index': i + 2 }"
        >
          <div class="cats-list__info">
            <strong>{{ cat.name }}</strong>
            <code>{{ cat.slug }}</code>
            <small>排序 {{ cat.sort }}</small>
          </div>
          <span class="cats-list__count">{{ cat.articleCount }} 篇文章</span>
          <div class="cats-list__ops">
            <button type="button" class="btn btn--ghost" @click="openCatEdit(cat)">编辑</button>
            <button type="button" class="btn btn--ghost danger-text" @click="askRemove('cat', cat.id)">
              删除
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== 标签 Tab ===== -->
    <template v-else>
      <div v-if="tagFormOpen" class="card tag-form fade-up" style="--stagger-index: 1">
        <label class="field-label" for="tag-name">名称 <em>*</em></label>
        <input
          id="tag-name"
          v-model="tagName"
          class="field-input"
          :class="{ 'is-invalid': !!tagError }"
          type="text"
          placeholder="如：Vue"
          @input="tagError = ''"
          @keyup.enter="saveTagForm"
        >
        <p v-if="tagError" class="field-error">{{ tagError }}</p>
        <footer class="cats-form__actions">
          <button type="button" class="btn" @click="cancelTagForm">取消</button>
          <button type="button" class="btn btn--primary" :disabled="saving" @click="saveTagForm">
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </footer>
      </div>

      <div class="card tags-cloud fade-up" style="--stagger-index: 2">
        <span
          v-for="(tag, i) in tagsStore.list"
          :key="tag.id"
          class="tags-cloud__item"
          :style="{ '--stagger-index': i + 2 }"
        >
          {{ tag.name }}
          <small>{{ tag.articleCount }}</small>
          <button type="button" aria-label="编辑" @click="openTagEdit(tag)">✎</button>
          <button type="button" class="danger-text" aria-label="删除" @click="askRemove('tag', tag.id)">✕</button>
        </span>
        <p v-if="!tagsStore.list.length" class="tags-cloud__empty">还没有标签，新增一个吧</p>
      </div>
    </template>

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
import type { Category, Tag } from '#shared/types'

definePageMeta({ layout: 'admin' })

useHead({ title: '分类 & 标签 - Forever 后台' })
useState('admin-page-title', () => '分类 & 标签')

const tab = ref<'cats' | 'tags'>('cats')

const categoriesStore = useCategoriesStore()
const tagsStore = useTagsStore()

await useAsyncData('admin-cats-tags', async () => {
  await Promise.all([categoriesStore.fetch(true), tagsStore.fetch(true)])
}, { server: false })

const saving = ref(false)

function reportError(err: unknown) {
  alert(err instanceof Error ? err.message : '操作失败')
}

/* ---------- 分类表单 ---------- */
const catFormOpen = ref(false)
const editingCatId = ref<number | null>(null)
const catForm = reactive({ name: '', slug: '', sort: 0 })
const catErrors = reactive({ name: '' })

function openCatCreate() {
  editingCatId.value = null
  Object.assign(catForm, { name: '', slug: '', sort: 0 })
  catErrors.name = ''
  catFormOpen.value = true
}

function openCatEdit(cat: Category) {
  editingCatId.value = cat.id
  Object.assign(catForm, { name: cat.name, slug: cat.slug, sort: cat.sort })
  catErrors.name = ''
  catFormOpen.value = true
}

function cancelCatForm() {
  catFormOpen.value = false
}

async function saveCatForm() {
  if (!catForm.name.trim()) {
    catErrors.name = '名称不能为空'
    return
  }
  saving.value = true
  try {
    const input = { name: catForm.name.trim(), slug: catForm.slug.trim() || undefined, sort: catForm.sort }
    if (editingCatId.value !== null) {
      await categoriesStore.update(editingCatId.value, input)
    } else {
      await categoriesStore.create(input)
    }
    catFormOpen.value = false
  } catch (err) {
    reportError(err)
  } finally {
    saving.value = false
  }
}

/* ---------- 标签表单 ---------- */
const tagFormOpen = ref(false)
const editingTagId = ref<number | null>(null)
const tagName = ref('')
const tagError = ref('')

function openTagCreate() {
  editingTagId.value = null
  tagName.value = ''
  tagError.value = ''
  tagFormOpen.value = true
}

function openTagEdit(tag: Tag) {
  editingTagId.value = tag.id
  tagName.value = tag.name
  tagError.value = ''
  tagFormOpen.value = true
}

function cancelTagForm() {
  tagFormOpen.value = false
}

async function saveTagForm() {
  const name = tagName.value.trim()
  if (!name) {
    tagError.value = '名称不能为空'
    return
  }
  saving.value = true
  try {
    if (editingTagId.value !== null) {
      await tagsStore.update(editingTagId.value, { name })
    } else {
      await tagsStore.create({ name })
    }
    tagFormOpen.value = false
  } catch (err) {
    reportError(err)
  } finally {
    saving.value = false
  }
}

/* ---------- 删除确认 ---------- */
const pendingDelete = ref<{ type: 'cat' | 'tag'; id: number } | null>(null)

const deleteMessage = computed(() => {
  if (!pendingDelete.value) return ''
  if (pendingDelete.value.type === 'cat') {
    const cat = categoriesStore.list.find(c => c.id === pendingDelete.value!.id)
    return `确定删除分类「${cat?.name ?? ''}」吗？该分类下的文章将变为未分类。`
  }
  const tag = tagsStore.list.find(t => t.id === pendingDelete.value!.id)
  return `确定删除标签「${tag?.name ?? ''}」吗？`
})

function askRemove(type: 'cat' | 'tag', id: number) {
  pendingDelete.value = { type, id }
}

async function confirmRemove() {
  if (!pendingDelete.value) return
  try {
    if (pendingDelete.value.type === 'cat') {
      await categoriesStore.remove(pendingDelete.value.id)
    } else {
      await tagsStore.remove(pendingDelete.value.id)
    }
  } catch (err) {
    reportError(err)
  } finally {
    pendingDelete.value = null
  }
}
</script>

<style scoped>
.cats-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.tabs {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 260px;
  padding: 4px;
  background: var(--c-bg-soft);
  border-radius: var(--radius-control);
}

.tabs__btn {
  padding: 7px 0;
  font-size: 13px;
  color: var(--c-text-secondary);
  background: none;
  border: none;
  border-radius: calc(var(--radius-control) - 2px);
  cursor: pointer;
  transition: color 0.2s;

  &.is-active {
    color: var(--c-primary);
    font-weight: 600;
  }
}

.tabs__indicator {
  position: absolute;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: var(--c-bg-card);
  border-radius: inherit;
  box-shadow: var(--shadow-card);
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);

  &.is-right {
    transform: translateX(100%);
  }
}

.cats-form,
.tag-form {
  margin-bottom: 16px;
  padding: 20px;

  h3 {
    margin: 0 0 14px;
    font-size: 15px;
  }
}

.cats-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  > div {
    margin-bottom: 14px;
  }
}

.field-input.is-invalid {
  border-color: var(--c-danger);
}

.cats-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;

  .btn {
    min-width: 76px;
    padding-block: 7px;
  }
}

.cats-list,
.tags-cloud {
  padding: 6px 20px;
}

.cats-list__row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  animation: fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--stagger-index, 0) * 60ms);

  & + & {
    border-top: 1px solid var(--c-border);
  }
}

.cats-list__info {
  display: flex;
  flex: 1;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
  flex-wrap: wrap;

  strong {
    font-size: 14px;
  }

  code {
    padding: 1px 8px;
    font-size: 12px;
    color: var(--c-primary);
    background: var(--c-primary-light);
    border-radius: 6px;
  }

  small {
    overflow: hidden;
    color: var(--c-text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.cats-list__count {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--c-text-muted);
}

.cats-list__ops {
  display: flex;
  flex-shrink: 0;
  gap: 2px;

  .btn {
    padding: 5px 10px;
    font-size: 13px;
  }
}

.danger-text {
  color: var(--c-danger);
}

.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 80px;
  align-content: flex-start;
  padding-block: 20px !important;
}

.tags-cloud__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 13px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 999px;
  box-shadow: var(--shadow-card);
  animation: fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--stagger-index, 0) * 60ms);

  small {
    color: var(--c-text-muted);
  }

  button {
    padding: 0 2px;
    font-size: 13px;
    line-height: 1;
    color: var(--c-text-muted);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.15s;

    &:hover {
      color: var(--c-primary);
    }

    &.danger-text:hover {
      color: var(--c-danger);
    }
  }
}

.tags-cloud__empty {
  width: 100%;
  padding: 24px 0;
  font-size: 13px;
  color: var(--c-text-muted);
  text-align: center;
}

@media (max-width: 640px) {
  .cats-form__row {
    grid-template-columns: 1fr;
  }
}
</style>
