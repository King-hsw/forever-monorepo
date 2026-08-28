<template>
  <div class="push-demo">
    <h1 class="push-demo__title">Web Push 推送演示</h1>
    <p class="push-demo__subtitle">
      浏览器原生推送链路演示：订阅与发送走本站 demo 路由，
      正式接入后由 forever-server 存储/下发，前端仅需替换接口前缀
    </p>

    <ul class="push-demo__status">
      <li>
        <span class="push-demo__label">环境支持</span>
        <span v-if="supported === null">检测中…</span>
        <span v-else-if="supported" class="push-demo__ok">✅ 支持</span>
        <span v-else class="field-error">❌ 需 HTTPS / localhost，且浏览器支持 Push API</span>
      </li>
      <li>
        <span class="push-demo__label">通知权限</span>
        <span>{{ permissionText }}</span>
      </li>
      <li>
        <span class="push-demo__label">订阅状态</span>
        <span v-if="subscribed">已订阅（…{{ endpointTail }}）</span>
        <span v-else>未订阅</span>
      </li>
      <li>
        <span class="push-demo__label">送达回执</span>
        <span v-if="delivered.count > 0">
          SW 已收到 {{ delivered.count }} 条推送（最近 {{ delivered.lastAt?.slice(11, 19) }}）
        </span>
        <span v-else>暂无（发送成功后 3 秒内刷新）</span>
      </li>
    </ul>

    <div class="push-demo__actions">
      <button
        v-if="!subscribed"
        class="btn btn--primary"
        :disabled="busy || supported === false"
        @click="onEnable"
      >
        {{ busy ? '订阅中…' : '开启通知并订阅' }}
      </button>
      <button
        v-else
        class="btn btn--danger"
        :disabled="busy"
        @click="onDisable"
      >
        取消订阅
      </button>
      <button
        class="btn btn--ghost"
        :disabled="busy || !subscribed"
        @click="onSendTest"
      >
        发送测试推送
      </button>
    </div>

    <p v-if="message" class="field-error" role="alert">{{ message }}</p>

    <section class="push-demo__hint">
      <h2>验证说明</h2>
      <ul>
        <li>桌面 Chrome / Edge 在 localhost 即可全流程验证，通知由操作系统弹出。</li>
        <li>iOS 16.4+ 必须先「添加到主屏幕」，从主屏幕图标打开本页才能订阅推送。</li>
        <li>手机浏览器经局域网 http 访问时非安全上下文，无法订阅，需 HTTPS 环境。</li>
        <li>订阅与 VAPID 密钥存在 .data/kv，dev 重启不丢失；删除 .data 即重置。</li>
      </ul>
      <p v-if="showIosHint" class="push-demo__warn">
        检测到 iOS Safari 普通标签页：Web Push 仅对添加到主屏幕的 PWA 生效。
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({ title: '推送演示 · 补陋阁' })

const { supported, permission, subscribed, busy, endpointTail, probe, enable, disable } = usePush()

const message = ref('')

/** 送达回执：SW 收到 push 后会 POST /demo-push/delivered，这里轮询展示 */
const delivered = ref<{ count: number, lastAt: string | null }>({ count: 0, lastAt: null })
let pollTimer: ReturnType<typeof setInterval> | undefined

async function pollDelivered() {
  try {
    delivered.value = await $fetch<{ count: number, lastAt: string | null }>('/demo-push/delivered')
  }
  catch {
    // dev 重启瞬间可能取不到，下一轮再试
  }
}

onMounted(() => {
  probe()
  pollDelivered()
  pollTimer = setInterval(pollDelivered, 3000)
})

onUnmounted(() => {
  if (pollTimer)
    clearInterval(pollTimer)
})

const permissionText = computed(() => ({
  granted: '已授予',
  denied: '已拒绝（需在浏览器站点设置中重置）',
  default: '未询问（点击上方按钮触发授权弹窗）',
}[permission.value]))

/** iOS Safari 普通标签页提示：非 standalone 即未安装到主屏幕 */
const showIosHint = computed(() => {
  if (import.meta.server)
    return false
  const ua = navigator.userAgent
  const isIOS = /iphone|ipad|ipod/i.test(ua)
    || (ua.includes('Macintosh') && 'ontouchend' in document) // iPadOS 伪装 Mac UA
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true
  return isIOS && !standalone
})

async function onEnable() {
  message.value = ''
  try {
    await enable()
  }
  catch (e) {
    message.value = e instanceof Error ? e.message : '订阅失败'
  }
}

async function onDisable() {
  message.value = ''
  try {
    await disable()
  }
  catch (e) {
    message.value = e instanceof Error ? e.message : '退订失败'
  }
}

async function onSendTest() {
  message.value = ''
  try {
    const res = await $fetch<{ total: number, sent: number, failed: number }>('/demo-push/send', {
      method: 'POST',
      body: {
        title: '补陋阁 · 测试推送',
        body: '这是一条 Web Push demo 测试消息，点击可跳转回本页',
        url: '/push-demo',
      },
    })
    if (res.sent > 0)
      message.value = ''
    else
      message.value = `发送失败：共 ${res.total} 条订阅，成功 ${res.sent} 条，失败 ${res.failed} 条（详见服务端日志）`
  }
  catch (e) {
    message.value = e instanceof Error ? e.message : '发送请求失败'
  }
}
</script>

<style scoped>
.push-demo {
  max-width: 560px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
}

.push-demo__title {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.push-demo__subtitle {
  color: var(--c-text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.push-demo__status {
  list-style: none;
  padding: 1rem 1.25rem;
  margin: 0 0 1.25rem;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  display: grid;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.push-demo__label {
  display: inline-block;
  width: 5em;
  color: var(--c-text-secondary);
}

.push-demo__ok {
  color: #16a34a;
}

.push-demo__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.push-demo__hint {
  margin-top: 2rem;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background: var(--c-bg-soft);
  font-size: 0.85rem;
  line-height: 1.8;
}

.push-demo__hint h2 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.push-demo__hint ul {
  padding-left: 1.2em;
  margin: 0;
}

.push-demo__warn {
  margin: 0.75rem 0 0;
  color: #b45309;
}
</style>
