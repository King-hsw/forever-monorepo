<template>
  <t-form
    ref="form"
    class="item-container login-password"
    :data="formData"
    :rules="FORM_RULES"
    label-width="0"
    @submit="onSubmit"
  >
    <t-form-item name="username">
      <t-input v-model="formData.username" size="large" placeholder="用户名" autocomplete="username" clearable>
        <template #prefix-icon>
          <t-icon name="user" />
        </template>
      </t-input>
    </t-form-item>

    <t-form-item name="password">
      <t-input
        v-model="formData.password"
        size="large"
        :type="showPsw ? 'text' : 'password'"
        placeholder="密码"
        autocomplete="current-password"
        clearable
        @enter="handleEnter"
      >
        <template #prefix-icon>
          <t-icon name="lock-on" />
        </template>
        <template #suffix-icon>
          <t-icon :name="showPsw ? 'browse' : 'browse-off'" @click="showPsw = !showPsw" />
        </template>
      </t-input>
    </t-form-item>

    <div class="check-container remember-pwd">
      <t-checkbox v-model="rememberMe">记住用户名</t-checkbox>
    </div>

    <t-form-item class="btn-container">
      <t-button block size="large" type="submit" :loading="submitting">登录</t-button>
    </t-form-item>
  </t-form>
</template>
<script setup lang="ts">
import type { FormInstanceFunctions, FormRule, SubmitContext } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useUserStore } from '@/store';

const REMEMBER_KEY = 'forever-admin-remember-username';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

const formData = ref({
  username: '',
  password: '',
});

const FORM_RULES = computed<Record<string, FormRule[]>>(() => ({
  username: [{ required: true, message: '请输入用户名', type: 'error' }],
  password: [{ required: true, message: '请输入密码', type: 'error' }],
}));

const form = ref<FormInstanceFunctions>();
const showPsw = ref(false);
const submitting = ref(false);
const rememberMe = ref(false);

// 回填上次记住的用户名
onMounted(() => {
  const saved = localStorage.getItem(REMEMBER_KEY);
  if (saved) {
    formData.value.username = saved;
    rememberMe.value = true;
  }
});

function persistUsername() {
  if (rememberMe.value && formData.value.username) {
    localStorage.setItem(REMEMBER_KEY, formData.value.username);
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
}

/** 请求登录；失败时把后端返回的业务提示原样抛出 */
async function doLogin() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    await userStore.login({
      username: formData.value.username.trim(),
      password: formData.value.password,
    });
    persistUsername();
    MessagePlugin.success('登录成功');
    const redirect = (route.query.redirect as string) || '/dashboard/index';
    router.replace(redirect);
  } catch (error) {
    MessagePlugin.error((error as Error).message || '登录失败，请重试');
  } finally {
    submitting.value = false;
  }
}

async function onSubmit(ctx: SubmitContext) {
  if (ctx.validateResult !== true) return;
  await doLogin();
}

/** 密码框回车直接提交，省去鼠标点击 */
function handleEnter() {
  form.value?.validate().then((result: unknown) => {
    if (result === true) doLogin();
  });
}
</script>
<style lang="less" scoped>
@import '../index.less';
</style>
