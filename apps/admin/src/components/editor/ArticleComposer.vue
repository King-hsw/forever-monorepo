<template>
  <div class="article-composer" :class="{ 'is-fullscreen': fullscreen }">
    <!-- 粘性操作条：返回 / 状态 / 全屏 / 设置 / 仅保存 / 保存并发布 -->
    <div class="composer__bar">
      <div class="composer__bar-left">
        <t-button variant="text" @click="emit('cancel')">
          <template #icon><t-icon name="chevron-left" /></template>
          返回列表
        </t-button>
        <t-tag v-if="status" :theme="status === 'PUBLISHED' ? 'success' : 'warning'" variant="light">
          {{ status === 'PUBLISHED' ? '已发布' : '草稿' }}
        </t-tag>
      </div>

      <div class="composer__bar-right">
        <t-button variant="outline" @click="toggleFullscreen">
          <template #icon><t-icon :name="fullscreen ? 'fullscreen-exit' : 'fullscreen'" /></template>
          {{ fullscreen ? '退出全屏' : '全屏' }}
        </t-button>
        <t-button variant="outline" @click="drawerVisible = true">
          <template #icon><t-icon name="setting" /></template>
          设置
        </t-button>
        <t-button theme="default" variant="outline" :loading="submitting" @click="submit('save')"> 仅保存 </t-button>
        <t-button v-if="canPublish" theme="primary" :loading="submitting" @click="submit('publish')">
          保存并发布
        </t-button>
      </div>
    </div>

    <!-- 文档纸面：工具栏 → 大标题 → 正文，居中单栏 -->
    <div class="composer__doc">
      <tiptap-editor
        v-model="form.contentHtml"
        v-model:markdown="form.markdown"
        :content-format="editorContentType"
        fluid
      >
        <template #header>
          <div class="composer__title-block">
            <t-input
              v-model="form.title"
              class="composer__title-input"
              placeholder="输入文章标题…"
              :maxlength="200"
              borderless
              size="large"
            />
            <p v-if="errors.title" class="field-error">{{ errors.title }}</p>
          </div>
        </template>
      </tiptap-editor>
    </div>

    <!-- 设置抽屉：摘要 / 分类 / 标签 / 别名 / 封面 / 类型 / 正文格式 -->
    <t-drawer v-model:visible="drawerVisible" header="文章设置" size="420px" :footer="false">
      <t-form :data="form" label-align="top">
        <t-form-item>
          <template #label>
            <div class="summary-head">
              <span>摘要</span>
              <t-button
                size="small"
                variant="text"
                theme="primary"
                :disabled="!initial?.id || aiSummaryBusy"
                :loading="aiSummaryBusy"
                @click="generateSummary"
              >
                AI 生成
              </t-button>
            </div>
          </template>
          <t-textarea
            v-model="form.summary"
            placeholder="列表页展示的摘要，最多 500 字（留空则由后端自动截取）"
            :maxlength="500"
            :autosize="{ minRows: 3, maxRows: 6 }"
          />
          <p v-if="!initial?.id" class="field-hint">保存文章后即可用 AI 生成摘要</p>
        </t-form-item>

        <t-form-item label="分类">
          <t-select v-model="form.categoryId" :options="categoryOptions" placeholder="选择分类" clearable />
        </t-form-item>

        <t-form-item label="标签">
          <t-tag-input v-model="form.tagNames" placeholder="输入标签，回车添加" clearable />
          <!-- TDesign 的 TagInput 只支持输入创建、没有建议下拉，这里补一行可点选的已有标签 -->
          <div v-if="tagSuggestions.length" class="tag-suggest">
            <span class="tag-suggest__label">已有：</span>
            <t-tag
              v-for="name in tagSuggestions"
              :key="name"
              class="tag-suggest__item"
              size="small"
              variant="light"
              @click="addTagName(name)"
            >
              {{ name }}
            </t-tag>
          </div>
        </t-form-item>

        <t-form-item label="别名 slug">
          <t-input v-model="form.slug" placeholder="留空由后端生成" :maxlength="200" />
        </t-form-item>

        <t-form-item label="封面图地址">
          <t-input v-model="form.coverImage" placeholder="图片直链，可留空" :maxlength="500" />
        </t-form-item>

        <t-form-item label="文章类型">
          <t-radio-group v-model="form.type" variant="default-filled">
            <t-radio-button value="ARTICLE">文章</t-radio-button>
            <t-radio-button value="PAGE">页面</t-radio-button>
          </t-radio-group>
        </t-form-item>

        <t-form-item label="正文格式">
          <t-radio-group v-model="form.contentFormat" variant="default-filled">
            <t-radio-button value="MARKDOWN">Markdown</t-radio-button>
            <t-radio-button value="HTML">HTML</t-radio-button>
          </t-radio-group>
          <p class="field-hint">仅决定保存时的存储格式，编辑器内的排版效果不变</p>
        </t-form-item>
      </t-form>
    </t-drawer>
  </div>
</template>
<script setup lang="ts">
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';

import { createTag, generateArticleAiSummary, getCategoryList, getTagList } from '@/api/content';
import type {
  ArticleResponse,
  ArticleSaveRequest,
  ArticleStatus,
  ArticleType,
  CategoryResponse,
  ContentFormat,
  TagResponse,
} from '@/api/model/types';

import TiptapEditor from './TiptapEditor.vue';
import { editorFullscreen } from './useEditorFullscreen';

const props = withDefaults(
  defineProps<{
    /** 编辑模式下的文章详情；新建时传 null */
    initial?: ArticleResponse | null;
    /** 文章当前状态（编辑页显示状态徽章；新建时不传） */
    status?: ArticleStatus | null;
    /** 保存请求进行中，禁用提交 */
    submitting?: boolean;
    /** 是否具备发布权限，决定「保存并发布」按钮是否出现 */
    canPublish?: boolean;
  }>(),
  { initial: null, status: null, submitting: false, canPublish: true },
);

const emit = defineEmits<{
  save: [payload: ArticleSaveRequest, action: 'save' | 'publish'];
  cancel: [];
}>();

/* ---------------- 表单状态 ---------------- */

const initialContent = props.initial?.content ?? '';
const initialIsHtml = (props.initial?.contentFormat ?? 'MARKDOWN') === 'HTML';

const form = reactive({
  title: props.initial?.title ?? '',
  summary: props.initial?.summary ?? '',
  slug: props.initial?.slug ?? '',
  coverImage: props.initial?.coverImage ?? '',
  categoryId: (props.initial?.categoryId ?? undefined) as number | undefined,
  // 标签用名称维护，提交时再解析成 id（后端只认 id）
  tagNames: (props.initial?.tags ?? []).map((tag) => tag.name),
  type: (props.initial?.type ?? 'ARTICLE') as ArticleType,
  contentFormat: (props.initial?.contentFormat ?? 'MARKDOWN') as ContentFormat,
  // 编辑器同时持有 HTML 与 Markdown 两份产物；按存储格式把初始正文放进对应的那份
  contentHtml: initialIsHtml ? initialContent : '',
  markdown: initialIsHtml ? '' : initialContent,
});

/** 后端存的是大写枚举，编辑器内部按 Tiptap 的原生小写词取解析方式 */
const editorContentType = computed<'markdown' | 'html'>(() => (form.contentFormat === 'HTML' ? 'html' : 'markdown'));

const errors = reactive({ title: '' });

/** 设置抽屉的显隐 */
const drawerVisible = ref(false);

/* ---------------- 全屏专注模式 ---------------- */

const fullscreen = editorFullscreen;

function toggleFullscreen() {
  fullscreen.value = !fullscreen.value;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && fullscreen.value) fullscreen.value = false;
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  // 离开页面时退出全屏，避免状态残留到其它后台页
  fullscreen.value = false;
});

/* ---------------- 分类 / 标签选项 ---------------- */

const categoryOptions = ref<{ label: string; value: number }[]>([]);
const tagNameOptions = ref<string[]>([]);

/** 标签名 → id 映射，提交时据此复用已有标签而不重复创建 */
const tagMap = ref<Map<string, number>>(new Map((props.initial?.tags ?? []).map((tag) => [tag.name, tag.id])));

/** 未选中的已有标签，供一键添加（最多列 10 个，避免把抽屉撑爆） */
const tagSuggestions = computed(() =>
  tagNameOptions.value.filter((name) => !form.tagNames.includes(name)).slice(0, 10),
);

function addTagName(name: string) {
  if (!form.tagNames.includes(name)) form.tagNames.push(name);
}

async function fetchOptions() {
  // 两个下拉数据源互相独立，任一失败不影响另一个
  const [categoryResult, tagResult] = await Promise.allSettled([getCategoryList(), getTagList()]);

  if (categoryResult.status === 'fulfilled') {
    categoryOptions.value = (categoryResult.value ?? []).map((item: CategoryResponse) => ({
      label: item.name,
      value: item.id,
    }));
  }
  if (tagResult.status === 'fulfilled') {
    const list = tagResult.value ?? [];
    tagNameOptions.value = list.map((item: TagResponse) => item.name);
    // 合并而非覆盖：列表接口若未返回某个已绑定标签，回退用详情里的映射
    const merged = new Map(tagMap.value);
    for (const item of list) merged.set(item.name, item.id);
    tagMap.value = merged;
  }
}

/**
 * 把标签名解析成后端要的 id 列表：已有标签直接复用，没有的现场创建。
 * 创建失败（如重名冲突）时跳过该标签并提示，不阻断整篇保存。
 */
async function resolveTagIds(names: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;

    const existing = tagMap.value.get(trimmed);
    if (existing !== undefined) {
      ids.push(existing);
      continue;
    }
    try {
      const created = await createTag({ name: trimmed });
      ids.push(created.id);
      tagMap.value.set(trimmed, created.id);
    } catch {
      MessagePlugin.warning(`标签「${trimmed}」创建失败，已跳过`);
    }
  }
  return ids;
}

/* ---------------- AI 摘要 ---------------- */

const aiSummaryBusy = ref(false);

async function generateSummary() {
  const id = props.initial?.id;
  if (!id || aiSummaryBusy.value) return;

  aiSummaryBusy.value = true;
  try {
    const article = await generateArticleAiSummary(id);
    form.summary = article.summary ?? form.summary;
    MessagePlugin.success('摘要已生成');
  } catch (error) {
    MessagePlugin.error((error as Error).message || 'AI 摘要生成失败');
  } finally {
    aiSummaryBusy.value = false;
  }
}

/* ---------------- 提交 ---------------- */

async function submit(action: 'save' | 'publish') {
  if (!form.title.trim()) {
    errors.title = '标题不能为空';
    return;
  }
  errors.title = '';

  // 正文按所选格式取对应的那份产物
  const content = form.contentFormat === 'HTML' ? form.contentHtml : form.markdown;
  if (!content.trim()) {
    MessagePlugin.warning('正文内容不能为空');
    return;
  }

  const payload: ArticleSaveRequest = {
    title: form.title.trim(),
    content,
    summary: form.summary.trim() || undefined,
    slug: form.slug.trim() || undefined,
    coverImage: form.coverImage.trim() || undefined,
    categoryId: form.categoryId ?? null,
    tagIds: await resolveTagIds(form.tagNames),
    type: form.type,
    contentFormat: form.contentFormat,
  };

  emit('save', payload, action);
}

onMounted(() => {
  void fetchOptions();
});
</script>
<style lang="less" scoped>
/* ---- 粘性操作条 ----
 * 内容区的滚动容器是 .tdesign-starter-layout，因此 sticky 贴它的顶边即可 */
.composer__bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  margin-bottom: 16px;
  background: var(--td-bg-color-page);
}

.composer__bar-left,
.composer__bar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ---- 文档纸面：居中单栏 ---- */
.composer__doc {
  max-width: 780px;
  margin-inline: auto;
  overflow: hidden;
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-component-border);
  border-radius: var(--td-radius-large);

  /* 编辑器自身的外框去掉，与纸面融为一体 */
  :deep(.tiptap-editor) {
    background: transparent;
    border: none;
    border-radius: 0;
  }

  :deep(.tiptap-editor .tiptap) {
    min-height: 62vh;
    padding: 8px 40px 72px;
  }
}

/* 全屏时纸面让出更多高度 */
.is-fullscreen {
  .composer__doc :deep(.tiptap-editor .tiptap) {
    min-height: calc(100vh - 140px);
  }
}

/* 大标题：无边框、通栏大字，像稿纸的标题行 */
.composer__title-block {
  padding: 24px 40px 0;

  /* TDesign 的 t-input 自带内边距，这里去掉以贴合纸面 */
  :deep(.t-input) {
    padding: 0;
  }

  :deep(.t-input__inner) {
    height: auto;
    font-size: 32px;
    font-weight: 700;
    line-height: 1.3;
    color: var(--td-text-color-primary);
    caret-color: var(--td-brand-color);
  }

  :deep(.t-input__inner::placeholder) {
    font-weight: 600;
    color: var(--td-text-color-placeholder);
    opacity: 0.55;
  }

  :deep(.t-input--focused .t-input__inner::placeholder) {
    opacity: 0.35;
  }
}

.field-error {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--td-error-color);
}

.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

/* 已有标签的一键添加行 */
.tag-suggest {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  margin-top: 8px;

  &__label {
    font-size: 12px;
    color: var(--td-text-color-placeholder);
  }

  &__item {
    cursor: pointer;
  }
}

.summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

@media (max-width: 720px) {
  .composer__doc {
    :deep(.tiptap-editor .tiptap) {
      min-height: 48vh;
      padding: 4px 20px 48px;
    }
  }

  .composer__title-block {
    padding: 16px 20px 0;

    :deep(.t-input__inner) {
      font-size: 24px;
    }
  }
}
</style>
