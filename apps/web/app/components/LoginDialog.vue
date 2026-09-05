<template>
  <!-- 弹窗式登录：遮罩 + 居中玻璃卡片，Teleport 到 body 脱离层叠；Esc/遮罩点击/路由变化均自动关闭 -->
  <Teleport to="body">
    <Transition name="login-dialog">
      <div v-if="props.open" class="login-dialog" @click.self="close">
        <div
          class="login-dialog__card"
          :class="{ 'is-shaking': shaking }"
          role="dialog"
          aria-modal="true"
          aria-label="登录"
        >
          <h2 class="login-dialog__title">登录</h2>
          <p class="login-dialog__subtitle">欢迎回来，请登录以继续</p>

          <form class="login-dialog__form" novalidate @submit.prevent="handleSubmit">
            <div class="login-dialog__field">
              <label class="field-label" for="login-dialog-username">账号</label>
              <input
                id="login-dialog-username"
                ref="usernameRef"
                v-model="username"
                class="field-input"
                type="text"
                name="username"
                placeholder="请输入账号"
                autocomplete="username"
              >
            </div>

            <div class="login-dialog__field">
              <label class="field-label" for="login-dialog-password">密码</label>
              <input
                id="login-dialog-password"
                v-model="password"
                class="field-input"
                type="password"
                name="password"
                placeholder="请输入密码"
                autocomplete="current-password"
              >
            </div>

            <p v-if="errorMsg" class="field-error" role="alert">{{ errorMsg }}</p>

            <button class="btn btn--primary login-dialog__submit" type="submit" :disabled="submitting">
              {{ submitting ? '登录中…' : '登 录' }}
            </button>
          </form>

          <NuxtLink to="/guest" class="login-dialog__guest" @click="close">
            {{ guest.isRegistered ? '切换游客身份 →' : '以游客身份发言 →' }}
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const auth = useAuthStore()
const guest = useGuestStore()

const username = ref('')
const password = ref('')
const errorMsg = ref('')
const submitting = ref(false)
const usernameRef = ref<HTMLInputElement | null>(null)

function close() {
  if (!props.open) return
  emit('close')
}

/* 打开：聚焦账号输入框 + 锁页面滚动；关闭：释放滚动锁 */
watch(
  () => props.open,
  (v) => {
    if (v) {
      nextTick(() => usernameRef.value?.focus())
      document.body.style.overflow = 'hidden'
    }
    else {
      document.body.style.overflow = ''
    }
  },
)

useOnEscape(close)

onUnmounted(() => {
  document.body.style.overflow = ''
})

// 路由变化时收起
const route = useRoute()
watch(() => route.fullPath, close)

/* 错误抖动：计数递增重触发动画，复用 main.css 的全局 shake 关键帧（auth 布局同模式） */
const shakeSeq = ref(0)
const shaking = ref(false)
watch(shakeSeq, () => {
  shaking.value = false
  requestAnimationFrame(() => {
    shaking.value = true
  })
})

function triggerShake() {
  shakeSeq.value++
}

/** 提交：成功清空表单并关弹窗，留在当前页不跳转；失败留弹窗显示错误并抖动 */
async function handleSubmit() {
  if (!username.value.trim() || !password.value) {
    errorMsg.value = '请输入账号和密码'
    triggerShake()
    return
  }
  submitting.value = true
  try {
    const ok = await auth.login(username.value.trim(), password.value)
    if (ok) {
      username.value = ''
      password.value = ''
      errorMsg.value = ''
      close()
      return
    }
    errorMsg.value = '账号或密码错误'
    triggerShake()
  }
  catch {
    errorMsg.value = '登录失败，请检查网络后重试'
    triggerShake()
  }
  finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* ---- 弹窗式登录：遮罩 + 居中玻璃卡片（骨架同全局搜索弹层） ---- */
.login-dialog {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--c-bg) 62%, transparent);
  backdrop-filter: blur(10px) saturate(1.2);
  -webkit-backdrop-filter: blur(10px) saturate(1.2);
}

.login-dialog__card {
  width: min(400px, calc(100vw - 32px));
  padding: 32px 28px 24px;
  background: color-mix(in srgb, var(--c-bg-card) 92%, transparent);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--c-border);
  border-radius: 20px;
  box-shadow: var(--shadow-card-hover);
}

.login-dialog__title {
  margin: 0 0 4px;
  font-size: 20px;
  text-align: center;
}

.login-dialog__subtitle {
  margin: 0 0 24px;
  font-size: 13px;
  text-align: center;
  color: var(--c-text-muted);
}

.login-dialog__form {
  width: 100%;
}

.login-dialog__field + .login-dialog__field {
  margin-top: 16px;
}

.login-dialog__submit {
  width: 100%;
  margin-top: 24px;
  padding-block: 10px;
  font-size: 15px;
}

/* 底部游客链接：文字链，已注册游客与未注册文案不同 */
.login-dialog__guest {
  display: block;
  margin-top: 18px;
  font-size: 13px;
  color: var(--c-primary);
  text-align: center;
  text-decoration: none;
  transition: color 0.15s ease;

  &:hover {
    color: var(--c-primary-hover);
    text-decoration: underline;
  }
}

/* 错误抖动：复用 main.css 全局 shake 关键帧 */
.login-dialog__card.is-shaking {
  animation: shake 0.4s ease both;
}

/* 减少透明度：磨砂变实底（弹层 Teleport 到 body，降级样式须随组件自带） */
@media (prefers-reduced-transparency: reduce) {
  .login-dialog {
    background: rgb(28 25 23 / 45%);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .login-dialog__card {
    background: var(--c-bg-card);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

/* 弹窗过渡：遮罩淡入淡出，卡片从下方缩放滑入 */
.login-dialog-enter-active {
  transition: opacity 0.28s ease;
}

.login-dialog-leave-active {
  transition: opacity 0.2s ease;
}

.login-dialog-enter-active .login-dialog__card,
.login-dialog-leave-active .login-dialog__card {
  transition:
    transform 0.34s var(--ease-bounce),
    opacity 0.24s ease;
}

.login-dialog-enter-from,
.login-dialog-leave-to {
  opacity: 0;
}

.login-dialog-enter-from .login-dialog__card {
  transform: translateY(24px) scale(0.94);
}

.login-dialog-leave-to .login-dialog__card {
  transform: translateY(12px) scale(0.97);
}
</style>
