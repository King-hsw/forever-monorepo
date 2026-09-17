<template>
  <div class="page-container">
    <t-card :bordered="false" class="page-card" title="脚手架说明">
      <t-paragraph>
        这是一个已经提纯的后台脚手架：只保留 <t-tag theme="primary" variant="light">布局 + 登录 + RBAC</t-tag>，
        业务功能按功能点逐个迁入。新增页面请遵循下面的约定，保证每个页面自洽、互不牵连。
      </t-paragraph>

      <t-steps :current="3" layout="vertical" class="doc-steps">
        <t-step-item
          title="建页面"
          content="src/pages/<模块>/index.vue，页面自带 scoped 样式，不要往全局样式里加页面样式"
        />
        <t-step-item title="建接口" content="src/api/<模块>.ts，只放 request 调用与类型，不在页面里直接写 URL" />
        <t-step-item
          title="建路由"
          content="src/router/modules/<模块>.ts，导出 RouteRecordRaw[]，被 import.meta.glob 自动收集"
        />
      </t-steps>
    </t-card>

    <t-card :bordered="false" class="page-card" title="路由 meta 约定">
      <t-table :data="metaRows" :columns="metaColumns" row-key="field" :bordered="false" size="small" />
    </t-card>

    <t-card :bordered="false" class="page-card" title="可直接抄的参考实现">
      <t-list :split="true">
        <t-list-item v-for="ref in references" :key="ref.path">
          <t-list-item-meta :title="ref.title" :description="ref.desc" />
          <template #action>
            <t-link theme="primary" @click="handleNavigate(ref.path)">打开</t-link>
          </template>
        </t-list-item>
      </t-list>
    </t-card>

    <t-card :bordered="false" class="page-card" title="权限控制">
      <t-paragraph>
        菜单不随角色变化，页面内用权限码控制到按钮级。权限码由后端启动时自动注册到
        <t-text code>/api/admin/permissions</t-text>，前端通过 <t-text code>/api/admin/me</t-text> 拉取。
      </t-paragraph>
      <t-alert theme="info" title="用法">
        <pre class="doc-code">
const userStore = useUserStore();
// 模板：v-if="userStore.hasPermission('article:create')"
// 脚本：if (!userStore.hasPermission('article:delete')) return;</pre>
      </t-alert>
    </t-card>
  </div>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router';

defineOptions({ name: 'ExampleIndex' });

const router = useRouter();

const metaColumns = [
  { colKey: 'field', title: '字段', width: 120 },
  { colKey: 'desc', title: '说明' },
];

const metaRows = [
  { field: 'title', desc: '菜单与页签标题，纯字符串（脚手架已去 i18n，不要再传对象）' },
  { field: 'icon', desc: '图标。传字符串图标名，或用 shallowRef(TDesignIcon) 包裹组件' },
  { field: 'orderNo', desc: '同级排序，越小越靠前；不填按 0 处理' },
  { field: 'single', desc: 'true 表示该父级下只有一个子页，侧边栏直接渲染成单项而不是折叠菜单' },
  { field: 'hidden', desc: 'true 则不出现在侧边栏，用于编辑页、详情页等细节路由' },
];

const references = [
  {
    title: '用户管理 — 完整 CRUD 列表页',
    desc: '搜索栏 + 表格 + 分页 + 弹窗表单的范本：apps/admin/src/pages/system/users/index.vue',
    path: '/system/users',
  },
  {
    title: '角色权限 — 权限矩阵',
    desc: '多选树 + 批量提交的范本：apps/admin/src/pages/system/roles/index.vue',
    path: '/system/roles',
  },
  {
    title: '个人资料 — 表单校验与提交',
    desc: '带 rules 校验、提交态与重置的范本：apps/admin/src/pages/profile/index.vue',
    path: '/profile/index',
  },
];

function handleNavigate(path: string) {
  router.push(path);
}
</script>
<style lang="less" scoped>
.page-container {
  padding: 16px;
}

.page-card {
  margin-top: 16px;
  border-radius: 8px;
}

.doc-steps {
  margin-top: 8px;
}

.doc-code {
  margin: 0;
  font-family: var(--td-font-family-mono, monospace);
  font-size: 12px;
  line-height: 20px;
  white-space: pre-wrap;
}
</style>
