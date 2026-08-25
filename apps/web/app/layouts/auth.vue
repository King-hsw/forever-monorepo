<template>
  <div class="auth-layout">
    <div class="auth-layout__theme"></div>
    <main class="auth-layout__card card fade-up" :class="{ 'is-shaking': shaking }">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
// 登录页不希望被搜索引擎收录
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const shaking = ref(false)

/** 错误抖动动画（由页面通过 useState 触发） */
const shakeFlag = useState('auth-shake', () => 0)
watch(shakeFlag, () => {
  shaking.value = false
  requestAnimationFrame(() => {
    shaking.value = true
  })
})
</script>

<style scoped>
.auth-layout {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(1200px 600px at 80% -10%, rgb(13 148 136 / 18%), transparent 60%),
    radial-gradient(900px 500px at -10% 110%, rgb(13 148 136 / 14%), transparent 55%),
    var(--c-bg);
}

.auth-layout__theme {
  position: absolute;
  top: 20px;
  right: 20px;
}

.auth-layout__card {
  width: min(400px, 100%);
  padding: 36px 32px;
}

.auth-layout__card.is-shaking {
  animation: shake 0.4s ease both;
}
</style>
