<template>
  <div class="guest">
    <div class="guest__logo" aria-hidden="true">游</div>
    <h1 class="guest__title">游客身份</h1>
    <p class="guest__subtitle">填好昵称和邮箱即可在评论区、聊天页发言，无需注册账号</p>

    <form class="guest__form" novalidate @submit.prevent="handleSubmit">
      <div class="guest__field">
        <label class="field-label" for="guest-nickname">昵称 *</label>
        <input
          id="guest-nickname"
          v-model="form.nickname"
          class="field-input"
          type="text"
          maxlength="20"
          placeholder="将展示在评论与聊天页"
          autocomplete="nickname"
        >
      </div>
      <div class="guest__field">
        <label class="field-label" for="guest-email">邮箱 *</label>
        <input
          id="guest-email"
          v-model="form.email"
          class="field-input"
          type="email"
          maxlength="100"
          placeholder="不公开，仅用于头像与回复通知"
          autocomplete="email"
        >
      </div>
      <div class="guest__field">
        <label class="field-label" for="guest-site">个人主页 <small class="guest__optional">选填</small></label>
        <input
          id="guest-site"
          v-model="form.site"
          class="field-input"
          type="url"
          maxlength="200"
          placeholder="以 http:// 或 https:// 开头"
          autocomplete="url"
        >
      </div>

      <p v-if="errorMsg" class="field-error" role="alert">{{ errorMsg }}</p>

      <button class="btn btn--primary guest__submit" type="submit" :disabled="submitting">
        {{ submitting ? '保存中…' : guest.isRegistered ? '更新身份' : '保存身份' }}
      </button>
      <button
        v-if="guest.isRegistered"
        type="button"
        class="btn btn--danger guest__clear"
        @click="clearIdentity"
      >
        清除身份
      </button>
    </form>

    <p class="guest__hint">身份仅保存在当前浏览器，清除浏览器数据后需重新填写</p>
    <NuxtLink to="/admin/login" class="guest__switch">{{ guest.isRegistered ? '切换账号登录' : '已有账号？切换账号登录' }}</NuxtLink>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

useHead({ title: '游客身份 · 补陋阁' })

const route = useRoute()
const guest = useGuestStore()

const form = reactive({
  nickname: guest.nickname,
  email: guest.email,
  site: guest.site,
})
const errorMsg = ref('')
const submitting = ref(false)

onMounted(() => {
  // 延到水合渲染完成后恢复身份，避免与 SSR 输出不一致；恢复后再预填表单
  guest.hydrate()
  form.nickname = guest.nickname
  form.email = guest.email
  form.site = guest.site
})

/** 保存后的回跳地址：只接受站内路径，防开放重定向 */
const redirect = computed(() => {
  const r = route.query.redirect
  if (typeof r !== 'string' || !r.startsWith('/') || r.startsWith('//') || r === '/guest')
    return '/'
  return r
})

function validate(): string {
  if (!form.nickname.trim())
    return '请填写昵称'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    return '请填写正确的邮箱'
  const site = form.site.trim()
  if (site && !/^https?:\/\//i.test(site))
    return '主页需以 http:// 或 https:// 开头'
  return ''
}

async function handleSubmit() {
  const err = validate()
  if (err) {
    errorMsg.value = err
    triggerShake()
    return
  }
  errorMsg.value = ''
  submitting.value = true
  guest.save({
    nickname: form.nickname.trim(),
    email: form.email.trim(),
    site: form.site.trim(),
  })
  await navigateTo(redirect.value)
}

function clearIdentity() {
  if (!confirm('确定清除当前游客身份？清除后需重新填写才能发言'))
    return
  guest.clear()
  form.nickname = form.email = form.site = ''
  errorMsg.value = ''
  // 清除后留在本页，不再自动跳回原地址
  history.replaceState(null, '', '/guest')
}

function triggerShake() {
  const flag = useState('auth-shake', () => 0)
  flag.value++
}
</script>

<style scoped>
.guest {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.guest__logo {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  font-size: 24px;
  font-weight: 700;
  color: var(--c-on-primary);
  background: var(--c-primary);
  border-radius: 50%;
  box-shadow: var(--shadow-card);
}

.guest__title {
  margin: 16px 0 4px;
  font-size: 22px;
}

.guest__subtitle {
  margin: 0 0 28px;
  font-size: 13px;
  color: var(--c-text-muted);
}

.guest__form {
  width: 100%;
}

.guest__field + .guest__field {
  margin-top: 16px;
}

.guest__optional {
  margin-left: 4px;
  font-size: 12px;
  font-weight: 400;
  color: var(--c-text-muted);
}

.guest__submit {
  width: 100%;
  margin-top: 24px;
  padding-block: 10px;
  font-size: 15px;
}

.guest__clear {
  width: 100%;
  margin-top: 10px;
  padding-block: 9px;
}

.guest__hint {
  margin: 20px 0 0;
  font-size: 12px;
  color: var(--c-text-muted);
  text-align: center;
}

/* 底部账号登录入口：文字链，游客已注册时省略前缀 */
.guest__switch {
  margin-top: 14px;
  font-size: 13px;
  color: var(--c-primary);
  text-align: center;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>
