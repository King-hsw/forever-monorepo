<template>
  <div class="page-container">
    <t-card :bordered="false" class="page-card">
      <template #title>
        <span>站点设置</span>
      </template>

      <template #actions>
        <t-button theme="default" variant="outline" :loading="loading" @click="fetchList">
          <template #icon><t-icon name="refresh" /></template>
          刷新
        </t-button>
      </template>

      <t-alert theme="info" :bordered="false" class="tip-alert">
        配置项由后端定义，修改后即时生效。清空内容并保存表示清除该项配置。
      </t-alert>

      <t-loading :loading="loading" show-overlay>
        <div v-if="settings.length" class="setting-list">
          <div v-for="item in settings" :key="item.key" class="setting-item">
            <div class="setting-item__meta">
              <div class="setting-item__desc">{{ item.description || item.key }}</div>
              <div class="setting-item__key">{{ item.key }}</div>
            </div>

            <div class="setting-item__control">
              <t-input
                v-model="draft[item.key]"
                class="setting-item__input"
                :placeholder="item.value ? '' : '未设置'"
                @enter="handleSave(item)"
              />
              <t-button
                theme="primary"
                variant="outline"
                :loading="savingKey === item.key"
                :disabled="isDirty(item) === false"
                @click="handleSave(item)"
              >
                保存
              </t-button>
            </div>
          </div>
        </div>

        <t-empty v-else-if="!loading" description="后端暂无可配置项" />
      </t-loading>
    </t-card>
  </div>
</template>
<script setup lang="ts">
import { MessagePlugin } from 'tdesign-vue-next';
import { onMounted, ref } from 'vue';

import type { SettingResponse } from '@/api/model/types';
import { getSettingList, updateSetting } from '@/api/site';

defineOptions({ name: 'SiteSettings' });

const settings = ref<SettingResponse[]>([]);
/** key -> 用户正在编辑的值 */
const draft = ref<Record<string, string>>({});
const loading = ref(false);
const savingKey = ref<string>('');

/** 仅当输入值与已保存值不同才允许提交，避免无意义的写库 */
function isDirty(item: SettingResponse) {
  return (draft.value[item.key] ?? '') !== (item.value ?? '');
}

async function fetchList() {
  loading.value = true;
  try {
    const list = (await getSettingList()) ?? [];
    settings.value = list;
    draft.value = Object.fromEntries(list.map((item) => [item.key, item.value ?? '']));
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载配置失败');
  } finally {
    loading.value = false;
  }
}

async function handleSave(item: SettingResponse) {
  if (!isDirty(item)) return;
  savingKey.value = item.key;
  try {
    const value = draft.value[item.key] ?? '';
    const updated = await updateSetting({ key: item.key, value });
    // 用后端返回值回写，保证界面与库内一致（例如后端对空串做了规整）
    const target = settings.value.find((setting) => setting.key === item.key);
    if (target) target.value = updated?.value ?? value;
    draft.value[item.key] = target?.value ?? value;
    MessagePlugin.success('已保存');
  } catch (error) {
    MessagePlugin.error((error as Error).message || '保存失败');
  } finally {
    savingKey.value = '';
  }
}

onMounted(fetchList);
</script>
<style lang="less" scoped>
.page-container {
  padding: 16px;
}

.tip-alert {
  margin-bottom: 16px;
}

.setting-list {
  display: flex;
  flex-direction: column;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px 0;
  border-bottom: 1px solid var(--td-component-stroke);

  &:last-child {
    border-bottom: none;
  }

  &__meta {
    flex: 1 1 40%;
    min-width: 0;
  }

  &__desc {
    font-size: 14px;
    color: var(--td-text-color-primary);
  }

  &__key {
    margin-top: 4px;
    font-family: var(--td-font-family-mono, monospace);
    font-size: 12px;
    color: var(--td-text-color-placeholder);
  }

  &__control {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1 1 60%;
  }

  &__input {
    flex: 1;
  }
}
</style>
