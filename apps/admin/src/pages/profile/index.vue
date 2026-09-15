<template>
  <div class="page-container">
    <!-- 顶部：头像与用户名（头像只读，后端无上传接口，不做编辑） -->
    <t-card :bordered="false" class="page-card profile-header">
      <div class="profile-header__avatar">
        <t-avatar size="64" :src="profile.avatarUrl || undefined">
          {{ profile.avatarUrl ? '' : avatarText }}
        </t-avatar>
      </div>
      <div class="profile-header__meta">
        <div class="profile-header__name">{{ profile.username || '未登录' }}</div>
        <div class="profile-header__sub">{{ profile.nickname || '暂无昵称' }}</div>
      </div>
    </t-card>

    <t-row :gutter="[16, 16]" class="profile-body">
      <!-- 基本信息 -->
      <t-col :xs="12" :md="6">
        <t-card :bordered="false" class="page-card" title="基本信息">
          <t-form
            ref="profileFormRef"
            :data="profileForm"
            :rules="profileRules"
            label-width="80px"
            :disabled="profileSubmitting"
            @submit="handleProfileSubmit"
          >
            <t-form-item label="用户名" name="username">
              <t-input v-model="profileForm.username" disabled placeholder="后端不允许修改" />
            </t-form-item>
            <t-form-item label="昵称" name="nickname">
              <t-input v-model="profileForm.nickname" placeholder="昵称，最多 50 字" :maxlength="50" />
            </t-form-item>
            <t-form-item label="邮箱" name="email">
              <t-input v-model="profileForm.email" placeholder="登录与通知邮箱" />
            </t-form-item>
            <t-form-item label="个人主页" name="site">
              <t-input v-model="profileForm.site" placeholder="个人站点 URL，可为空" />
            </t-form-item>
            <t-form-item>
              <t-space>
                <t-button theme="primary" type="submit" :loading="profileSubmitting">保存修改</t-button>
                <t-button theme="default" variant="outline" @click="resetProfileForm">重置</t-button>
              </t-space>
            </t-form-item>
          </t-form>
        </t-card>
      </t-col>

      <!-- 修改密码 -->
      <t-col :xs="12" :md="6">
        <t-card :bordered="false" class="page-card" title="修改密码">
          <t-form
            ref="pwdFormRef"
            :data="pwdForm"
            :rules="pwdRules"
            label-width="80px"
            :disabled="pwdSubmitting"
            @submit="handlePwdSubmit"
          >
            <t-form-item label="原密码" name="oldPassword">
              <t-input v-model="pwdForm.oldPassword" type="password" placeholder="请输入当前密码" />
            </t-form-item>
            <t-form-item label="新密码" name="newPassword">
              <t-input
                v-model="pwdForm.newPassword"
                type="password"
                placeholder="6–100 位"
                @change="onNewPasswordChange"
              />
            </t-form-item>
            <t-form-item label="确认密码" name="confirmPassword">
              <t-input v-model="pwdForm.confirmPassword" type="password" placeholder="再次输入新密码" />
            </t-form-item>
            <t-form-item>
              <t-space>
                <t-button theme="primary" type="submit" :loading="pwdSubmitting">修改密码</t-button>
                <t-button theme="default" variant="outline" @click="resetPwdForm">清空</t-button>
              </t-space>
            </t-form-item>
          </t-form>
        </t-card>
      </t-col>
    </t-row>
  </div>
</template>

<script setup lang="ts">
import type { FormInstanceFunctions, FormRule, SubmitContext } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';

import { changePassword, getProfile, updateProfile } from '@/api/auth';
import type { ProfileResponse } from '@/api/model/types';
import { useUserStore } from '@/store';

defineOptions({ name: 'ProfileIndex' });

const userStore = useUserStore();

const profile = ref<ProfileResponse>({ username: '', nickname: '', email: '', site: '', avatarUrl: '' });

/** 头像为空时显示用户名首字母（大写） */
const avatarText = computed(() => (profile.value.username ? profile.value.username.charAt(0).toUpperCase() : ''));

/* ---------------- 基本信息 ---------------- */

const profileFormRef = ref<FormInstanceFunctions>();
const profileSubmitting = ref(false);
const profileForm = ref<{ username: string; nickname: string; email: string; site: string }>({
  username: '',
  nickname: '',
  email: '',
  site: '',
});

const profileRules: Record<string, FormRule[]> = {
  nickname: [
    { required: true, message: '请输入昵称', type: 'error' },
    { max: 50, message: '昵称最多 50 字', type: 'error' },
  ],
  email: [
    { required: true, message: '请输入邮箱', type: 'error' },
    { email: true, message: '邮箱格式不正确', type: 'error' },
  ],
  site: [{ url: true, message: '个人主页格式不正确', type: 'error' }],
};

function fillProfileForm(data: ProfileResponse) {
  profileForm.value = {
    username: data.username,
    nickname: data.nickname,
    email: data.email,
    site: data.site,
  };
}

function resetProfileForm() {
  fillProfileForm(profile.value);
  profileFormRef.value?.clearValidate?.();
}

async function handleProfileSubmit(ctx?: SubmitContext) {
  if (ctx && ctx.validateResult !== true) return;

  profileSubmitting.value = true;
  try {
    const updated = await updateProfile({
      nickname: profileForm.value.nickname.trim(),
      email: profileForm.value.email.trim(),
      site: profileForm.value.site.trim() || undefined,
    });
    profile.value = updated;
    fillProfileForm(updated);
    // 刷新全局用户信息，保证顶栏等位置同步昵称/头像
    await userStore.fetchUserInfo();
    MessagePlugin.success('资料已更新');
  } catch (error) {
    MessagePlugin.error((error as Error).message || '保存失败');
  } finally {
    profileSubmitting.value = false;
  }
}

/* ---------------- 修改密码 ---------------- */

const pwdFormRef = ref<FormInstanceFunctions>();
const pwdSubmitting = ref(false);
const pwdForm = ref<{ oldPassword: string; newPassword: string; confirmPassword: string }>({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const pwdRules: Record<string, FormRule[]> = {
  oldPassword: [{ required: true, message: '请输入原密码', type: 'error' }],
  newPassword: [
    { required: true, message: '请输入新密码', type: 'error' },
    { min: 6, message: '新密码至少 6 位', type: 'error' },
    { max: 100, message: '新密码最多 100 位', type: 'error' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', type: 'error' },
    {
      validator: (val) => {
        if (val !== pwdForm.value.newPassword) {
          return { result: false, message: '两次输入的密码不一致', type: 'error' };
        }
        return true;
      },
    },
  ],
};

/** 新密码变动时，触发确认密码重新校验 */
function onNewPasswordChange() {
  if (pwdForm.value.confirmPassword) {
    pwdFormRef.value?.validate?.({ fields: ['confirmPassword'] });
  }
}

function resetPwdForm() {
  pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' };
  pwdFormRef.value?.clearValidate?.();
}

async function handlePwdSubmit(ctx?: SubmitContext) {
  if (ctx && ctx.validateResult !== true) return;

  pwdSubmitting.value = true;
  try {
    await changePassword({
      oldPassword: pwdForm.value.oldPassword,
      newPassword: pwdForm.value.newPassword,
    });
    resetPwdForm();
    MessagePlugin.success('密码已修改，请牢记新密码');
  } catch (error) {
    MessagePlugin.error((error as Error).message || '修改密码失败');
  } finally {
    pwdSubmitting.value = false;
  }
}

/* ---------------- 初始化 ---------------- */

async function fetchProfile() {
  try {
    const data = await getProfile();
    profile.value = data;
    fillProfileForm(data);
  } catch (error) {
    MessagePlugin.error((error as Error).message || '加载个人资料失败');
  }
}

onMounted(fetchProfile);
</script>

<style lang="less" scoped>
.page-container {
  padding: 16px;
}

.page-card {
  border-radius: 8px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;

  &__avatar {
    flex-shrink: 0;
  }

  &__name {
    font-size: 18px;
    font-weight: 600;
    color: var(--td-text-color-primary);
  }

  &__sub {
    margin-top: 4px;
    font-size: 13px;
    color: var(--td-text-color-placeholder);
  }
}

.profile-body {
  margin-top: 16px;
}
</style>
