<template>
  <div class="login-page">
    <form class="login-card" @submit.prevent="onSubmit">
      <h1>管理后台</h1>
      <p class="login-subtitle">forever-admin</p>

      <label class="field">
        <span>用户名</span>
        <input v-model.trim="username" type="text" autocomplete="username" required />
      </label>
      <label class="field">
        <span>密码</span>
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>

      <button type="submit" :disabled="loading">
        {{ loading ? '登录中…' : '登录' }}
      </button>

      <p v-if="error" class="login-error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  if (!username.value || !password.value) return
  loading.value = true
  error.value = ''
  try {
    await auth.login(username.value, password.value)
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  padding: 1rem;
}

.login-card {
  background: #fff;
  border-radius: 8px;
  padding: 2rem;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-card h1 {
  font-size: 1.25rem;
  margin: 0;
  text-align: center;
}

.login-subtitle {
  color: #888;
  font-size: 0.8rem;
  text-align: center;
  margin: -0.5rem 0 0.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field span {
  font-size: 0.85rem;
  color: #555;
}

.field input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
}

button {
  padding: 0.6rem;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 0.95rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-error {
  color: #d32f2f;
  font-size: 0.85rem;
  text-align: center;
}
</style>
