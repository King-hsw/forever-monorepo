<template>
  <div class="apply-page">
    <!-- ===== Header ===== -->
    <header class="site-header">
      <div class="site-header__inner">
        <NuxtLink to="/" class="brand">
          <span class="brand__mark" aria-hidden="true" />
          <span class="brand__name">Forever</span>
        </NuxtLink>
        <div class="site-header__theme"><ThemeToggle /></div>
      </div>
    </header>

    <main class="wrap">
      <h1 class="apply-title fade-up">申请友链</h1>

      <!-- 申请要求提示 -->
      <section class="card apply-rules fade-up" style="--stagger-index: 1">
        <h2>申请前请确认</h2>
        <ul>
          <li>站点可正常访问，且为独立博客 / 个人网站</li>
          <li>有原创内容，非纯采集、非空站点</li>
          <li>含合法内容，无违法违规信息</li>
          <li>已在贵站添加本站友链：<code>Forever · https://forever.example.com</code></li>
        </ul>
        <p class="apply-rules__hint">提交后需要人工审核，通过后即会在<a href="/friends">友链页</a>展示。</p>
      </section>

      <!-- 申请表单 -->
      <form class="card apply-form fade-up" style="--stagger-index: 2" @submit.prevent="submit">
        <div>
          <label class="field-label" for="apply-name">站点名称 <em>*</em></label>
          <input
            id="apply-name"
            v-model="form.name"
            class="field-input"
            :class="{ 'is-invalid': !!errors.name }"
            type="text"
            maxlength="100"
            placeholder="例如：张三的小站"
            @input="errors.name = ''"
          >
          <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
        </div>

        <div>
          <label class="field-label" for="apply-url">站点地址 <em>*</em></label>
          <input
            id="apply-url"
            v-model="form.siteUrl"
            class="field-input"
            :class="{ 'is-invalid': !!errors.siteUrl }"
            type="url"
            placeholder="https://example.com"
            @input="errors.siteUrl = ''"
          >
          <p v-if="errors.siteUrl" class="field-error">{{ errors.siteUrl }}</p>
        </div>

        <div>
          <label class="field-label" for="apply-icon">站点图标 / 头像地址</label>
          <input
            id="apply-icon"
            v-model="form.iconUrl"
            class="field-input"
            type="url"
            placeholder="https://example.com/avatar.png（选填）"
          >
        </div>

        <div>
          <label class="field-label" for="apply-desc">一句话简介</label>
          <input
            id="apply-desc"
            v-model="form.description"
            class="field-input"
            type="text"
            maxlength="200"
            placeholder="展示在友链卡片上，50 字以内（选填）"
          >
        </div>

        <div>
          <label class="field-label" for="apply-contact">联系方式</label>
          <input
            id="apply-contact"
            v-model="form.contact"
            class="field-input"
            type="text"
            maxlength="200"
            placeholder="邮箱等，便于反馈审核结果，不会公开（选填）"
          >
        </div>

        <footer class="apply-form__actions">
          <NuxtLink to="/friends" class="btn">返回友链页</NuxtLink>
          <button type="submit" class="btn btn--primary" :disabled="submitting">
            {{ submitting ? '提交中…' : '提交申请' }}
          </button>
        </footer>
      </form>

      <!-- 提交成功 -->
      <section v-if="submitted" class="card apply-done fade-up" style="--stagger-index: 3">
        <p class="apply-done__emoji">🎉</p>
        <p class="apply-done__title">申请已提交！</p>
        <p class="apply-done__desc">感谢支持，审核通过后会展示在友链页。如留了联系方式，届时会通知你。</p>
        <NuxtLink to="/friends" class="btn btn--primary">返回友链页</NuxtLink>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { FriendLinkApplyInput } from '~/stores/types'
import { ApiError, apiFetch } from '~/utils/api'

useHead({ title: '申请友链 - Forever' })

const form = reactive({
  name: '',
  siteUrl: '',
  iconUrl: '',
  description: '',
  contact: '',
})
const errors = reactive({ name: '', siteUrl: '' })
const submitting = ref(false)
const submitted = ref(false)

function validate(): boolean {
  if (!form.name.trim()) errors.name = '站点名称不能为空'
  if (!form.siteUrl.trim()) {
    errors.siteUrl = '站点地址不能为空'
  } else if (!/^https?:\/\/.+/.test(form.siteUrl.trim())) {
    errors.siteUrl = '必须是合法的 http(s) 地址'
  }
  return !errors.name && !errors.siteUrl
}

async function submit() {
  errors.name = ''
  errors.siteUrl = ''
  if (!validate()) return

  submitting.value = true
  try {
    const input: FriendLinkApplyInput = { name: form.name.trim(), siteUrl: form.siteUrl.trim() }
    if (form.iconUrl.trim()) input.iconUrl = form.iconUrl.trim()
    if (form.description.trim()) input.description = form.description.trim()
    if (form.contact.trim()) input.contact = form.contact.trim()
    await apiFetch<void>('/api/v1/friend-links/apply', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    })
    submitted.value = true
    // 清空表单并滚到成功提示
    Object.assign(form, { name: '', siteUrl: '', iconUrl: '', description: '', contact: '' })
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  } catch (err) {
    const message = err instanceof ApiError ? err.message : '提交失败，请稍后再试'
    alert(message)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.apply-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--c-bg-soft);
}

.site-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 50;
  background: color-mix(in srgb, var(--c-bg-soft) 78%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--c-border);
}

.site-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 800px;
  margin: 0 auto;
  padding: 14px 20px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.brand__mark,
.brand__name {
  color: var(--c-text);
}

.wrap {
  flex: 1;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 88px 20px 48px;
}

.apply-title {
  margin: 0 0 18px;
  font-size: 26px;
}

/* 申请要求 */
.apply-rules {
  padding: 20px;

  h2 {
    margin: 0 0 10px;
    font-size: 16px;
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding-left: 20px;
    font-size: 13.5px;
    line-height: 1.7;
    color: var(--c-text-secondary);
  }

  code {
    padding: 1px 6px;
    font-size: 12px;
    background: var(--c-bg-soft);
    border-radius: 6px;
  }
}

.apply-rules__hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--c-text-muted);

  a {
    color: var(--c-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

/* 表单 */
.apply-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;

  em {
    font-style: normal;
    color: var(--c-danger);
  }
}

.field-input.is-invalid {
  border-color: var(--c-danger);
}

.apply-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;

  .btn {
    min-width: 96px;
  }
}

/* 成功提示 */
.apply-done {
  margin-top: 20px;
  padding: 28px;
  text-align: center;
}

.apply-done__emoji {
  margin: 0 0 6px;
  font-size: 36px;
}

.apply-done__title {
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 600;
}

.apply-done__desc {
  margin: 0 0 16px;
  font-size: 13.5px;
  color: var(--c-text-muted);
}
</style>
