<template>
  <div class="login">
    <div class="login__logo" aria-hidden="true">F</div>
    <h1 class="login__title">Forever 后台</h1>
    <p class="login__subtitle">欢迎回来，请登录以继续</p>

    <form class="login__form" novalidate @submit.prevent="handleSubmit">
      <div class="login__field">
        <label class="field-label" for="login-username">账号</label>
        <input
          id="login-username"
          v-model="username"
          class="field-input"
          type="text"
          name="username"
          placeholder="请输入账号"
          autocomplete="username"
        >
      </div>

      <div class="login__field">
        <label class="field-label" for="login-password">密码</label>
        <input
          id="login-password"
          v-model="password"
          class="field-input"
          type="password"
          name="password"
          placeholder="请输入密码"
          autocomplete="current-password"
        >
      </div>

      <p v-if="errorMsg" class="field-error" role="alert">{{ errorMsg }}</p>

      <button class="btn btn--primary login__submit" type="submit">登 录</button>
    </form>

    <p class="login__hint">演示账号：admin / 123456</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

useHead({ title: '登录 - Forever 后台' })

const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const errorMsg = ref('')

async function handleSubmit() {
  if (!username.value.trim() || !password.value) {
    errorMsg.value = '请输入账号和密码'
    triggerShake()
    return
  }
  if (auth.login(username.value.trim(), password.value)) {
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/admin'
    await navigateTo(redirect)
    return
  }
  errorMsg.value = '账号或密码错误'
  triggerShake()
}

function triggerShake() {
  const flag = useState('auth-shake', () => 0)
  flag.value++
}
</script>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login__logo {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  font-size: 26px;
  font-weight: 700;
  color: var(--c-on-primary);
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 50%;
  box-shadow: var(--shadow-card);
}

.login__title {
  margin: 16px 0 4px;
  font-size: 22px;
}

.login__subtitle {
  margin: 0 0 28px;
  font-size: 13px;
  color: var(--c-text-muted);
}

.login__form {
  width: 100%;
}

.login__field + .login__field {
  margin-top: 16px;
}

.login__submit {
  width: 100%;
  margin-top: 24px;
  padding-block: 10px;
  font-size: 15px;
}

.login__hint {
  margin: 20px 0 0;
  font-size: 12px;
  color: var(--c-text-muted);
}
</style>
