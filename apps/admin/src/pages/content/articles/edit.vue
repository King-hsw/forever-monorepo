<template>
  <div class="page-container">
    <article-composer
      v-if="ready"
      :initial="article"
      :status="article?.status ?? null"
      :submitting="submitting"
      :can-publish="canPublish"
      @save="handleSave"
      @cancel="goBack"
    />
    <div v-else class="page-loading">
      <t-loading :loading="true" size="large" text="加载中…" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { createArticle, getArticle, publishArticle, updateArticle } from '@/api/content';
import type { ArticleResponse, ArticleSaveRequest } from '@/api/model/types';
import ArticleComposer from '@/components/editor/ArticleComposer.vue';
import { useUserStore } from '@/store';

defineOptions({ name: 'ArticleEdit' });

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const articleId = computed(() => {
  const raw = route.params.id;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
});
const isEdit = computed(() => articleId.value !== null);

const loading = ref(false);
const submitting = ref(false);
const article = ref<ArticleResponse | null>(null);

/** 新建页没有详情需要载入，直接可渲染；编辑页等详情回来再挂载 composer */
const ready = computed(() => !isEdit.value || article.value !== null);

const canPublish = computed(() => userStore.hasPermission('article:publish'));

async function fetchArticle() {
  if (articleId.value === null) return;
  loading.value = true;
  try {
    article.value = await getArticle(articleId.value);
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载文章详情失败');
  } finally {
    loading.value = false;
  }
}

/**
 * 保存文章。
 *
 * 注意后端把「保存」和「发布」拆成了两个动作：保存接口（POST/PUT）不带 status，
 * 发布要另外调 publishArticle。所以「保存并发布」是保存成功后再发一次发布请求。
 *
 * PUT 为全量覆盖语义，payload 由 composer 侧回填了所有字段，这里不做裁剪。
 */
async function handleSave(payload: ArticleSaveRequest, action: 'save' | 'publish') {
  if (submitting.value) return;
  submitting.value = true;
  try {
    let savedId = articleId.value;

    if (savedId !== null) {
      article.value = await updateArticle(savedId, payload);
    } else {
      const created = await createArticle(payload);
      article.value = created;
      savedId = created.id;
      // 新建成功后切到编辑路由：后续保存走 PUT，AI 摘要等依赖 id 的能力也随之可用
      await router.replace(`/content/articles/${created.id}/edit`);
    }

    if (action === 'publish' && savedId !== null) {
      await publishArticle(savedId);
      MessagePlugin.success('已保存并发布');
      router.push('/content/articles');
    } else {
      MessagePlugin.success('已保存');
    }
  } catch (error) {
    MessagePlugin.error((error as Error).message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

function goBack() {
  router.push('/content/articles');
}

onMounted(() => {
  void fetchArticle();
});
</script>
<style lang="less" scoped>
.page-container {
  padding: 0 16px 16px;
}

.page-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
</style>
