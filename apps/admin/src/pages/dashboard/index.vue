<template>
  <div class="page-container">
    <!-- 统计卡片：响应式栅格，所有统计并发加载，单个失败不影响整页 -->
    <t-row :gutter="[16, 16]">
      <t-col v-for="card in cards" :key="card.key" :xs="12" :sm="8" :md="6">
        <t-card :bordered="false" class="stat-card" :style="{ '--accent': card.accent }">
          <t-loading :loading="loading" :show-overlay="false" size="small">
            <div class="stat-card__icon">
              <t-icon :name="card.icon" />
            </div>
            <div class="stat-card__value">
              {{ loading ? '' : stats[card.key] === null ? '-' : stats[card.key] }}
            </div>
            <div class="stat-card__label">{{ card.label }}</div>
          </t-loading>
        </t-card>
      </t-col>
    </t-row>

    <!-- 快捷操作 -->
    <t-card :bordered="false" class="page-card" title="快捷操作">
      <t-space :size="16" break-line>
        <t-button
          v-for="action in actions"
          :key="action.path"
          theme="default"
          variant="outline"
          @click="handleNavigate(action.path)"
        >
          <template #icon><t-icon :name="action.icon" /></template>
          {{ action.label }}
        </t-button>
      </t-space>
    </t-card>
  </div>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { getPermissionList, getRoleList, getUserList } from '@/api/system';

defineOptions({ name: 'DashboardIndex' });

const router = useRouter();

/** 是否处于首次加载（控制卡片骨架/loading 态） */
const loading = ref(true);

/**
 * 统计值映射：
 * - 加载中为 null（卡片显示 loading）
 * - 加载成功为数字
 * - 加载失败保持 null（卡片显示 `-`，并在控制台报错，不弹窗打扰）
 */
const stats = reactive<Record<string, number | null>>({
  users: null,
  roles: null,
  permissions: null,
});

const cards = [
  { key: 'users', label: '用户总数', icon: 'usergroup', accent: 'var(--td-brand-color)' },
  { key: 'roles', label: '角色数', icon: 'secured', accent: 'var(--td-warning-color)' },
  { key: 'permissions', label: '权限点', icon: 'lock-on', accent: 'var(--td-success-color)' },
] as const;

const actions = [
  { path: '/system/users', label: '用户管理', icon: 'usergroup' },
  { path: '/system/roles', label: '角色权限', icon: 'secured' },
  { path: '/profile/index', label: '个人资料', icon: 'user-circle' },
  { path: '/example/index', label: '脚手架说明', icon: 'help-circle' },
] as const;

function handleNavigate(path: string) {
  router.push(path);
}

/** 把 Promise.allSettled 的结果安全地写入统计值，失败项保持 null 并在控制台报错 */
function applyResult(
  result: PromiseSettledResult<unknown>,
  key: keyof typeof stats,
  extractor: (v: unknown) => number,
) {
  if (result.status === 'fulfilled') {
    try {
      stats[key] = extractor(result.value);
    } catch (error) {
      console.error(`[dashboard] 解析统计「${key}」失败`, error);
      stats[key] = null;
    }
  } else {
    console.error(`[dashboard] 统计「${key}」加载失败`, result.reason);
    stats[key] = null;
  }
}

async function fetchStats() {
  loading.value = true;
  try {
    // 所有统计并发发起，单个接口失败不导致整页空白
    const [users, roles, permissions] = await Promise.allSettled([getUserList(), getRoleList(), getPermissionList()]);

    applyResult(users, 'users', (v) => (v as unknown[]).length);
    applyResult(roles, 'roles', (v) => (v as unknown[]).length);
    applyResult(permissions, 'permissions', (v) => (v as unknown[]).length);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchStats);
</script>
<style lang="less" scoped>
.page-container {
  padding: 16px;
}

.page-card {
  margin-top: 16px;
  border-radius: 8px;
}

.stat-card {
  border-radius: 8px;
  border-top: 3px solid var(--accent, var(--td-brand-color));

  &__icon {
    font-size: 20px;
    color: var(--accent, var(--td-brand-color));
    margin-bottom: 8px;
  }

  &__value {
    font-size: 28px;
    font-weight: 500;
    line-height: 36px;
    color: var(--td-text-color-primary);
  }

  &__label {
    margin-top: 4px;
    font-size: 13px;
    color: var(--td-text-color-placeholder);
  }
}
</style>
