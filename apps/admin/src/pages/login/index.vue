<template>
  <div class="login-wrapper">
    <login-header />

    <div class="login-container">
      <div class="title-container">
        <h1 class="title margin-no">登录到</h1>
        <h1 class="title">Forever 管理后台</h1>
        <div class="sub-title">
          <p class="tip">用户、角色与权限管理</p>
        </div>
      </div>

      <login />
      <tdesign-setting />
    </div>

    <footer class="copyright">Copyright © 2026 Forever. All Rights Reserved.</footer>
  </div>
</template>
<script setup lang="ts">
import TdesignSetting from '@/layouts/setting.vue';

import LoginHeader from './components/Header.vue';
import Login from './components/Login.vue';

defineOptions({
  name: 'LoginIndex',
});
</script>
<style lang="less" scoped>
@import './index.less';
</style>
