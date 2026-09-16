<template>
  <div class="page-container">
    <t-card :bordered="false" class="page-card" :loading="loading">
      <template #title>
        <div class="editor-header">
          <t-button variant="text" shape="square" @click="handleCancel">
            <template #icon><t-icon name="chevron-left" /></template>
          </t-button>
          <span>{{ isEdit ? '编辑文章' : '写文章' }}</span>
          <t-tag v-if="isEdit" variant="light-outline" size="small">{{ articleStatusText }}</t-tag>
        </div>
      </template>

      <template #actions>
        <t-space>
          <t-button theme="default" variant="outline" :loading="submitting" @click="handleSubmit(false)"
            >保存草稿</t-button
          >
          <t-button theme="primary" :loading="submitting" @click="handleSubmit(true)">
            {{ isEdit ? '保存并返回' : '创建文章' }}
          </t-button>
        </t-space>
      </template>

      <t-row :gutter="[24, 24]">
        <t-col :xs="12" :lg="8">
          <t-form ref="formRef" :data="formData" :rules="RULES" label-width="0" @submit="handleSubmit(true)">
            <t-form-item name="title">
              <t-input v-model="formData.title" size="large" placeholder="请输入文章标题" :maxlength="200" />
            </t-form-item>

            <t-form-item name="content">
              <div class="content-editor">
                <t-textarea
                  v-model="formData.content"
                  class="content-editor__input"
                  placeholder="正文内容，支持 Markdown 语法"
                  :autosize="{ minRows: 24, maxRows: 40 }"
                />
                <div class="content-editor__meta">
                  <span>{{ formData.content.length }} 字</span>
                  <span class="text-muted"
                    >格式：{{ formData.contentFormat === 'MARKDOWN' ? 'Markdown' : 'HTML' }}</span
                  >
                </div>
              </div>
            </t-form-item>
          </t-form>
        </t-col>

        <t-col :xs="12" :lg="4">
          <t-card title="发布设置" :bordered="true" class="side-card">
            <t-form :data="formData" label-align="top">
              <t-form-item label="分类">
                <t-select v-model="formData.categoryId" :options="categoryOptions" placeholder="选择分类" clearable />
              </t-form-item>

              <t-form-item label="标签">
                <t-select
                  v-model="formData.tagIds"
                  :options="tagOptions"
                  placeholder="选择标签"
                  multiple
                  clearable
                  :min-collapsed-num="3"
                />
              </t-form-item>

              <t-form-item label="文章类型">
                <t-radio-group v-model="formData.type" variant="default-filled">
                  <t-radio-button value="ARTICLE">文章</t-radio-button>
                  <t-radio-button value="PAGE">页面</t-radio-button>
                </t-radio-group>
              </t-form-item>

              <t-form-item label="正文格式">
                <t-radio-group v-model="formData.contentFormat" variant="default-filled">
                  <t-radio-button value="MARKDOWN">Markdown</t-radio-button>
                  <t-radio-button value="HTML">HTML</t-radio-button>
                </t-radio-group>
              </t-form-item>
            </t-form>
          </t-card>

          <t-card title="摘要与封面" :bordered="true" class="side-card">
            <t-form :data="formData" label-align="top">
              <t-form-item label="别名 slug">
                <t-input v-model="formData.slug" placeholder="留空由后端生成" :maxlength="200" />
              </t-form-item>

              <t-form-item label="摘要">
                <t-textarea
                  v-model="formData.summary"
                  placeholder="列表页展示的摘要，最多 500 字"
                  :maxlength="500"
                  :autosize="{ minRows: 3, maxRows: 6 }"
                />
              </t-form-item>

              <t-form-item label="封面图地址">
                <t-input v-model="formData.coverImage" placeholder="图片直链，可留空" :maxlength="500" />
              </t-form-item>
            </t-form>
          </t-card>
        </t-col>
      </t-row>
    </t-card>
  </div>
</template>
<script setup lang="ts">
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { createArticle, getArticle, getCategoryList, getTagList, updateArticle } from '@/api/content';
import type {
  ArticleSaveRequest,
  ArticleStatus,
  ArticleType,
  CategoryResponse,
  ContentFormat,
  TagResponse,
} from '@/api/model/types';

defineOptions({ name: 'ArticleEdit' });

const route = useRoute();
const router = useRouter();

const articleId = computed(() => {
  const raw = route.params.id;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
});
const isEdit = computed(() => articleId.value !== null);

const loading = ref(false);
const submitting = ref(false);
const articleStatus = ref<ArticleStatus>('DRAFT');
const formRef = ref<FormInstanceFunctions>();

const formData = ref<
  Omit<ArticleSaveRequest, 'categoryId'> & {
    categoryId: number | undefined;
    contentFormat: ContentFormat;
    type: ArticleType;
  }
>({
  title: '',
  content: '',
  summary: '',
  slug: '',
  coverImage: '',
  categoryId: undefined,
  tagIds: [],
  type: 'ARTICLE',
  contentFormat: 'MARKDOWN',
});

const RULES: Record<string, FormRule[]> = {
  title: [{ required: true, message: '请输入文章标题', type: 'error' }],
  content: [{ required: true, message: '请输入正文内容', type: 'error' }],
};

const categoryOptions = ref<{ label: string; value: number }[]>([]);
const tagOptions = ref<{ label: string; value: number }[]>([]);

const articleStatusText = computed(() => (articleStatus.value === 'PUBLISHED' ? '已发布' : '草稿'));

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
    tagOptions.value = (tagResult.value ?? []).map((item: TagResponse) => ({
      label: item.name,
      value: item.id,
    }));
  }
}

/**
 * 载入文章详情。
 * 注意后端 PUT 是全量覆盖语义，这里把所有字段都回填，避免保存时被置空。
 */
async function fetchArticle() {
  if (articleId.value === null) return;
  loading.value = true;
  try {
    const detail = await getArticle(articleId.value);
    formData.value = {
      title: detail.title ?? '',
      content: detail.content ?? '',
      summary: detail.summary ?? '',
      slug: detail.slug ?? '',
      coverImage: detail.coverImage ?? '',
      categoryId: detail.categoryId ?? undefined,
      tagIds: (detail.tags ?? []).map((tag) => tag.id),
      type: detail.type ?? 'ARTICLE',
      contentFormat: detail.contentFormat ?? 'MARKDOWN',
    };
    articleStatus.value = detail.status ?? 'DRAFT';
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载文章详情失败');
  } finally {
    loading.value = false;
  }
}

async function handleSubmit(goBack: boolean) {
  const validateResult = await formRef.value?.validate();
  if (validateResult !== true) return;

  if (submitting.value) return;
  submitting.value = true;
  try {
    const payload: ArticleSaveRequest = {
      title: formData.value.title.trim(),
      content: formData.value.content,
      summary: formData.value.summary?.trim() || undefined,
      slug: formData.value.slug?.trim() || undefined,
      coverImage: formData.value.coverImage?.trim() || undefined,
      categoryId: formData.value.categoryId ?? null,
      tagIds: formData.value.tagIds ?? [],
      type: formData.value.type,
      contentFormat: formData.value.contentFormat,
    };

    if (isEdit.value && articleId.value !== null) {
      await updateArticle(articleId.value, payload);
      MessagePlugin.success(goBack ? '已保存，正在返回列表' : '已保存');
    } else {
      await createArticle(payload);
      MessagePlugin.success('文章已创建');
    }

    if (goBack) router.push('/content/articles');
  } catch (error) {
    MessagePlugin.error((error as Error).message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

function handleCancel() {
  router.push('/content/articles');
}

onMounted(async () => {
  await fetchOptions();
  await fetchArticle();
});
</script>
<style lang="less" scoped>
.page-container {
  padding: 16px;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.content-editor {
  width: 100%;

  &__input {
    width: 100%;

    :deep(textarea) {
      font-family: var(--td-font-family-mono, monospace);
      line-height: 1.7;
    }
  }

  &__meta {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: 12px;
    color: var(--td-text-color-secondary);
  }
}

.side-card {
  &:not(:last-child) {
    margin-bottom: 16px;
  }
}

.text-muted {
  color: var(--td-text-color-placeholder);
}
</style>
