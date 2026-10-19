<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <p>占位页——Task 4 将迁入完整后台壳层。</p>
    <button @click="auth.logout()">登出</button>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
const auth = useAuthStore()
</script>

<style scoped>
.dashboard {
  padding: 2rem;
  font-family: system-ui, sans-serif;
}
</style>
