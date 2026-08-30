<template>
  <div class="utest">
    <header class="utest__head">
      <h1>文件直传测试页</h1>
      <p class="utest__sub">
        验证 forever-server 的直传 / 分片 / 断点续传能力。BASE_URL：
        <code>{{ apiBase || '（同源）' }}</code>；PUT 均直连对象存储（RustFS），不经后端转发。
      </p>
    </header>

    <!-- 1 · 登录区 -->
    <section class="utest-card">
      <h2 class="utest-card__title">1 · 登录</h2>
      <form v-if="!auth" class="utest-login" @submit.prevent="handleLogin">
        <input
          v-model="username"
          class="field-input"
          type="text"
          placeholder="账号"
          autocomplete="username"
        >
        <input
          v-model="password"
          class="field-input"
          type="password"
          placeholder="密码"
          autocomplete="current-password"
        >
        <button class="btn btn--primary" type="submit" :disabled="loggingIn || !username.trim() || !password">
          {{ loggingIn ? '登录中…' : '登录' }}
        </button>
      </form>
      <p v-if="!auth && loginError" class="field-error" role="alert">{{ loginError }}</p>
      <div v-if="auth" class="utest-authed">
        <span class="utest-ok">已登录：<b>{{ auth.username }}</b>，token：<code>{{ auth.token.slice(0, 20) }}…</code></span>
        <button class="btn btn--ghost" type="button" @click="handleLogout">退出登录</button>
      </div>
      <p v-if="authError" class="field-error" role="alert">{{ authError }}</p>
    </section>

    <!-- 2 · 单文件直传区 -->
    <section class="utest-card">
      <h2 class="utest-card__title">2 · 单文件直传（presign → PUT，建议 ≤8MB）</h2>
      <input ref="singleInput" class="utest-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/mp4,audio/wav,.m4a" @change="onSinglePick">
      <p v-if="singlePrecheck" class="field-error" role="alert">{{ singlePrecheck }}</p>
      <p v-else-if="singleHint" class="utest-muted">{{ singleHint }}</p>

      <div class="utest-actions">
        <button class="btn btn--primary" type="button" :disabled="!singleFile || !!singlePrecheck || singleBusy" @click="startSingle">
          {{ singleBusy ? '上传中…' : '开始上传' }}
        </button>
        <button v-if="singleBusy" class="btn btn--danger" type="button" @click="cancelSingle">取消上传</button>
      </div>

      <div v-if="singleBusy || singleProgress > 0" class="utest-bar"><i :style="{ width: `${singleProgress}%` }" /></div>
      <p v-if="singleProgress > 0" class="utest-muted">{{ singleProgress }}%</p>
      <p v-if="singleNotice" class="utest-muted" role="status">{{ singleNotice }}</p>
      <p v-if="singleError" class="field-error" role="alert">{{ singleError }}</p>

      <div v-if="singleResult" class="utest-result">
        <p>assetId：<code>{{ singleResult.assetId }}</code></p>
        <p>
          accessUrl：<a :href="singleResult.accessUrl" target="_blank" rel="noopener">{{ singleResult.accessUrl }}</a>
        </p>
        <img v-if="singleKind === 'image'" :src="singleResult.accessUrl" class="utest-preview" alt="上传结果预览">
        <audio v-else-if="singleKind === 'audio'" :src="singleResult.accessUrl" controls class="utest-audio" />
      </div>
    </section>

    <!-- 3 & 4 · 大文件分片 / 断点续传区 -->
    <section class="utest-card">
      <h2 class="utest-card__title">3 · 大文件分片上传 / 断点续传（init → 分片 PUT → complete）</h2>
      <input ref="mpInput" class="utest-file" type="file" accept="video/mp4,video/webm" @change="onMultipartPick">
      <p v-if="mpPrecheck" class="field-error" role="alert">{{ mpPrecheck }}</p>
      <p v-if="mpSavedHint" class="utest-hint">♻️ {{ mpSavedHint }}</p>

      <div class="utest-actions">
        <button class="btn btn--primary" type="button" :disabled="!mpFile || !!mpPrecheck || mpBusy" @click="startMultipart">
          {{ mpBusy ? '上传中…' : '开始上传' }}
        </button>
        <button v-if="mpBusy" class="btn" type="button" @click="interruptMultipart">模拟中断</button>
        <button v-if="mpBusy" class="btn btn--danger" type="button" @click="cancelMultipart">取消上传</button>
        <button v-if="mpSaved && !mpBusy" class="btn btn--danger" type="button" @click="discardSaved">放弃本地会话</button>
      </div>

      <div v-if="mpBusy || mpProgress > 0" class="utest-bar"><i :style="{ width: `${mpProgress}%` }" /></div>
      <p v-if="mpProgress > 0" class="utest-muted">{{ mpProgress }}%（XHR 分片进度累加）</p>
      <p v-if="mpSession" class="utest-muted">
        <b :class="mpResumeInfo?.resumed ? 'utest-tag-resume' : 'utest-tag-fresh'">{{ mpResumeInfo?.resumed ? '续传' : '全新会话' }}</b>
        assetId：<code>{{ mpSession.assetId }}</code>
        ｜ partSize：<code>{{ fmtBytes(mpSession.partSize) }}</code>
        ｜ 共 <code>{{ mpSession.partCount }}</code> 片
        <template v-if="mpResumeInfo?.uploadedParts.length">
          ｜ 服务端已传：<code>{{ mpResumeInfo.uploadedParts.join(', ') }}</code>（将跳过，只补缺失分片）
        </template>
      </p>
      <p v-if="mpNotice" class="utest-muted" role="status">{{ mpNotice }}</p>
      <p v-if="mpError" class="field-error" role="alert">{{ mpError }}</p>

      <div v-if="mpResult" class="utest-result">
        <p>assetId：<code>{{ mpResult.assetId }}</code> ｜ 大小：<code>{{ fmtBytes(mpResult.sizeBytes) }}</code></p>
        <p>
          accessUrl：<a :href="mpResult.accessUrl" target="_blank" rel="noopener">{{ mpResult.accessUrl }}</a>
        </p>
        <video :src="mpResult.accessUrl" controls class="utest-video" />
      </div>
    </section>

    <!-- 6 · 发布联测 -->
    <section class="utest-card">
      <h2 class="utest-card__title">4 · 发布联测（POST /api/admin/moments + 公开时间线）</h2>
      <p v-if="!uploadedItems.length" class="utest-muted">暂无已上传素材，先在上方完成一次上传。</p>
      <template v-else>
        <p class="utest-muted">勾选要带入发布请求的 accessUrl（图片 ≤9 个；契约固定 audio: null，音频不参与发布）：</p>
        <ul class="utest-media-list">
          <li v-for="item in uploadedItems" :key="item.id">
            <label :class="{ 'is-disabled': item.kind === 'audio' }">
              <input
                type="checkbox"
                :disabled="item.kind === 'audio'"
                :checked="item.checked"
                @change="toggleItem(item)"
              >
              <span class="utest-media-kind" :data-kind="item.kind">{{ kindLabel[item.kind] }}</span>
              <span class="utest-media-name">{{ item.name }}</span>
              <a class="utest-media-url" :href="item.accessUrl" target="_blank" rel="noopener">{{ item.accessUrl }}</a>
            </label>
          </li>
        </ul>
      </template>

      <textarea v-model="pubContent" class="field-input utest-textarea" rows="3" placeholder="动态文本（与媒体至少填一项）" />

      <div class="utest-actions">
        <button class="btn btn--primary" type="button" :disabled="pubBusy" @click="publish">
          {{ pubBusy ? '发布中…' : '发布动态' }}
        </button>
        <button class="btn btn--ghost" type="button" :disabled="pubBusy" @click="checkTimeline()">查询公开时间线</button>
      </div>
      <p v-if="pubError" class="field-error" role="alert">{{ pubError }}</p>

      <div v-if="pubResult" class="utest-result">
        <p class="utest-ok">✅ 发布成功：id=<code>{{ pubResult.id }}</code>，以下用后端返回的 media 直链渲染（证明公网可读）：</p>
        <div class="utest-pub-grid">
          <img v-for="(img, i) in pubResult.media.images" :key="i" :src="img" class="utest-preview" alt="发布图片">
          <video v-if="pubResult.media.video" :src="pubResult.media.video" controls class="utest-video" />
        </div>
      </div>

      <div v-if="pubTimeline" class="utest-result">
        <p v-if="pubVisible === true" class="utest-ok">
          ✅ 公开时间线确认：本次动态出现在 GET /api/v1/moments 前 {{ pubTimeline.list.length }} 条中
        </p>
        <p v-else-if="pubVisible === false" class="field-error">
          ❌ 公开时间线前 {{ pubTimeline.list.length }} 条中未找到本次动态（id={{ pubResult?.id }}）
        </p>
        <ol class="utest-timeline">
          <li v-for="m in pubTimeline.list" :key="m.id" :class="{ 'is-mine': m.id === pubResult?.id }">
            #{{ m.id }} {{ m.content.slice(0, 40) || '（无文本）' }}
            <span class="utest-muted">（图 {{ m.media.images.length }} / 视频 {{ m.media.video ? 1 : 0 }}）</span>
          </li>
        </ol>
      </div>
    </section>

    <!-- 7 · 调试面板 -->
    <section class="utest-card">
      <div class="utest-debug-head">
        <h2 class="utest-card__title">5 · 调试面板</h2>
        <span class="utest-muted">{{ logs.length }} 条</span>
        <button class="btn btn--ghost" type="button" @click="logs = []">清空</button>
      </div>
      <p v-if="!logs.length" class="utest-muted">暂无请求记录；每次请求 / 响应都会落在这里，PUT 目标应为 RustFS 直链。</p>
      <details v-for="log in logs" :key="log.id" class="utest-log" :class="{ 'is-err': log.status === 0 || log.status >= 400 }">
        <summary>
          <span class="utest-log-time">{{ log.time }}</span>
          <b class="utest-log-method">{{ log.method }}</b>
          <span class="utest-log-url">{{ log.url }}</span>
          <span class="utest-log-status">→ {{ log.status === 0 ? '网络错误' : log.status }}</span>
          <span class="utest-log-ms">{{ log.durationMs }}ms</span>
        </summary>
        <p v-if="log.note" class="utest-log-note">{{ log.note }}</p>
        <pre v-if="log.detail" class="utest-log-detail">{{ log.detail }}</pre>
      </details>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Moment, PageResult } from '#shared/types'
import {
  abortUpload,
  apiJson,
  clearUploadAuth,
  fileKind,
  fingerprintOf,
  getUploadRecord,
  loadUploadAuth,
  onUploadLog,
  precheckFile,
  saveUploadAuth,
  type ResumeInfo,
  type UploadAuth,
  type MediaKind,
  type UploadLogEntry,
  type UploadMultipartResult,
  type UploadOneResult,
  type UploadRecord,
} from '~/utils/directUpload'

// 纯客户端测试页，无需博客布局；robots 禁止收录
definePageMeta({ layout: false })
useHead({
  title: '文件直传测试页 - 补陋阁',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const MB = 1024 * 1024
const config = useRuntimeConfig()
const apiBase = computed(() => config.public.apiBase as string)

function fmtBytes(n: number): string {
  if (n >= MB) return `${(n / MB).toFixed(1).replace(/\.0$/, '')}MB`
  if (n >= 1024) return `${Math.round(n / 1024)}KB`
  return `${n}B`
}

const kindLabel: Record<MediaKind, string> = { image: '图', audio: '音', video: '视' }

/* ---------- 调试面板 ---------- */

interface DebugEntry {
  id: number
  time: string
  method: string
  url: string
  status: number
  durationMs: number
  detail?: string
  note?: string
}

const logs = ref<DebugEntry[]>([])
let logId = 0
let offLog: (() => void) | null = null

onMounted(() => {
  offLog = onUploadLog((entry: UploadLogEntry) => {
    logs.value.push({
      id: ++logId,
      time: new Date(entry.time).toLocaleTimeString('zh-CN', { hour12: false }),
      method: entry.method,
      url: entry.url,
      status: entry.status,
      durationMs: entry.durationMs,
      detail: entry.detail ? JSON.stringify(entry.detail, null, 2) : undefined,
      note: entry.note,
    })
    if (logs.value.length > 300) logs.value.splice(0, logs.value.length - 300)
  })
})
onUnmounted(() => offLog?.())

/* ---------- 1 · 登录 ---------- */

const auth = ref<UploadAuth | null>(null)
const username = ref('')
const password = ref('')
const loggingIn = ref(false)
const loginError = ref('')
const authError = ref('')

onMounted(() => { auth.value = loadUploadAuth() })

async function handleLogin() {
  loginError.value = ''
  authError.value = ''
  loggingIn.value = true
  try {
    // 登录不带旧令牌（token 传空字符串）
    const data = await apiJson<{ accessToken: string }>('/api/auth/login', {
      method: 'POST',
      token: '',
      body: { username: username.value.trim(), password: password.value },
    })
    saveUploadAuth({ token: data.accessToken, username: username.value.trim(), savedAt: Date.now() })
    auth.value = loadUploadAuth()
    password.value = ''
  } catch (err) {
    loginError.value = err instanceof Error ? err.message : '登录失败'
  } finally {
    loggingIn.value = false
  }
}

function handleLogout() {
  clearUploadAuth()
  auth.value = null
  authError.value = ''
}

/* ---------- 2 · 单文件直传 ---------- */

const singleInput = ref<HTMLInputElement | null>(null)
const singleFile = ref<File | null>(null)
const singleKind = ref<MediaKind | null>(null)
const singlePrecheck = ref('')
const singleHint = ref('')
const singleBusy = ref(false)
const singleProgress = ref(0)
const singleResult = ref<UploadOneResult | null>(null)
const singleError = ref('')
const singleNotice = ref('')
let singleAbort: AbortController | null = null

function onSinglePick() {
  const file = singleInput.value?.files?.[0] ?? null
  // 立即清空 input.value，保证重新选择同一文件时 change 仍会触发
  if (singleInput.value) singleInput.value.value = ''
  singleFile.value = file
  singleKind.value = file ? fileKind(file) : null
  singlePrecheck.value = file ? (precheckFile(file) ?? '') : ''
  singleHint.value = file && !singlePrecheck.value && file.size > 8 * MB
    ? '提示：文件超过 8MB，建议改用下方分片上传（直传仍可尝试）'
    : ''
  singleProgress.value = 0
  singleResult.value = null
  singleError.value = ''
  singleNotice.value = ''
}

async function startSingle() {
  const file = singleFile.value
  if (!file || singlePrecheck.value || singleBusy.value) return
  singleBusy.value = true
  singleError.value = ''
  singleNotice.value = ''
  singleProgress.value = 0
  singleResult.value = null
  const ac = new AbortController()
  singleAbort = ac
  try {
    const result = await uploadOne(file, p => (singleProgress.value = p), {
      cancelSignal: ac.signal,
    })
    singleResult.value = result
    addUploadedItem(file, result.accessUrl, result.assetId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '上传失败'
    if (ac.signal.aborted) singleNotice.value = msg
    else singleError.value = msg
  } finally {
    singleBusy.value = false
    singleAbort = null
  }
}

function cancelSingle() {
  singleAbort?.abort()
}

/* ---------- 3 · 分片上传 / 断点续传 ---------- */

const mpInput = ref<HTMLInputElement | null>(null)
const mpFile = ref<File | null>(null)
const mpPrecheck = ref('')
const mpBusy = ref(false)
const mpProgress = ref(0)
const mpResult = ref<UploadMultipartResult | null>(null)
const mpError = ref('')
const mpNotice = ref('')
const mpSaved = ref<UploadRecord | null>(null)
const mpSavedHint = ref('')
const mpResumeInfo = ref<ResumeInfo | null>(null)
const mpSession = ref<{ assetId: number; partSize: number; partCount: number } | null>(null)
let mpInterruptCtl: AbortController | null = null
let mpCancelCtl: AbortController | null = null

async function onMultipartPick() {
  const file = mpInput.value?.files?.[0] ?? null
  // 立即清空 input.value，保证「中断后重选同一文件」时 change 仍会触发
  if (mpInput.value) mpInput.value.value = ''
  mpFile.value = file
  mpPrecheck.value = file ? (precheckFile(file) ?? '') : ''
  mpProgress.value = 0
  mpResult.value = null
  mpError.value = ''
  mpNotice.value = ''
  mpResumeInfo.value = null
  mpSession.value = null
  mpSaved.value = null
  mpSavedHint.value = ''
  if (!file || mpPrecheck.value) return
  // 重选同一文件：按指纹查本地未完成会话，提示将走 resume 续传
  const saved = await getUploadRecord(fingerprintOf(file))
  if (saved) {
    mpSaved.value = saved
    mpSavedHint.value = `本地存在未完成会话：assetId=${saved.assetId}，${saved.fileName}（${fmtBytes(saved.fileSize)}，共 ${saved.partCount} 片 × ${fmtBytes(saved.partSize)}）。点「开始上传」将先 resume 对账服务端已传分片，只补缺失分片`
  }
}

async function startMultipart() {
  const file = mpFile.value
  if (!file || mpPrecheck.value || mpBusy.value) return
  mpBusy.value = true
  mpError.value = ''
  mpNotice.value = ''
  mpProgress.value = 0
  mpResult.value = null
  const interruptCtl = new AbortController()
  const cancelCtl = new AbortController()
  mpInterruptCtl = interruptCtl
  mpCancelCtl = cancelCtl
  try {
    const result = await uploadMultipart(
      file,
      p => (mpProgress.value = p),
      (info) => {
        mpResumeInfo.value = info
        mpSession.value = { assetId: info.assetId, partSize: info.partSize, partCount: info.partCount }
      },
      {
        interruptSignal: interruptCtl.signal,
        cancelSignal: cancelCtl.signal,
      },
    )
    mpResult.value = result
    addUploadedItem(file, result.accessUrl, result.assetId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '上传失败'
    // 中断 / 取消是预期流程，用提示而非错误样式
    if (interruptCtl.signal.aborted || cancelCtl.signal.aborted) mpNotice.value = msg
    else mpError.value = msg
  } finally {
    mpBusy.value = false
    mpInterruptCtl = null
    mpCancelCtl = null
    // 会话终态后重查本地记录：complete / 取消后应已清除，中断后应保留
    if (mpFile.value) mpSaved.value = (await getUploadRecord(fingerprintOf(mpFile.value))) ?? null
    if (mpSaved.value) {
      mpSavedHint.value = `会话已保留：assetId=${mpSaved.value.assetId}。重新选择同一文件即可续传；也可点「放弃本地会话」彻底作废`
    } else {
      mpSavedHint.value = ''
    }
  }
}

function interruptMultipart() {
  mpInterruptCtl?.abort()
}

function cancelMultipart() {
  mpCancelCtl?.abort()
}

async function discardSaved() {
  const saved = mpSaved.value
  if (!saved) return
  try {
    await abortUpload(saved.assetId, saved.fingerprint)
    mpSaved.value = null
    mpSavedHint.value = ''
    mpNotice.value = `会话 ${saved.assetId} 已放弃：服务端档案已删、本地记录已清，再次上传将走全新 init`
  } catch (err) {
    mpError.value = err instanceof Error ? err.message : '放弃会话失败'
  }
}

/* ---------- 4 · 发布联测 ---------- */

interface UploadedItem {
  id: number
  name: string
  kind: MediaKind
  accessUrl: string
  assetId: number
  checked: boolean
}

const uploadedItems = ref<UploadedItem[]>([])
let uploadedItemId = 0

function addUploadedItem(file: File, accessUrl: string, assetId: number) {
  const kind = fileKind(file)
  if (!kind) return
  uploadedItems.value.push({ id: ++uploadedItemId, name: file.name, kind, accessUrl, assetId, checked: false })
}

function toggleItem(item: UploadedItem) {
  pubError.value = ''
  if (item.kind === 'audio') return
  if (item.kind === 'video') {
    // 视频单选：契约里 video 只有一个
    const next = !item.checked
    uploadedItems.value.forEach((i) => { if (i.kind === 'video') i.checked = false })
    item.checked = next
    return
  }
  if (!item.checked && pickedImages.value.length >= 9) {
    pubError.value = 'images 最多 9 个，请先取消一个再勾选'
    return
  }
  item.checked = !item.checked
}

const pickedImages = computed(() => uploadedItems.value.filter(i => i.kind === 'image' && i.checked).map(i => i.accessUrl))
const pickedVideo = computed(() => uploadedItems.value.find(i => i.kind === 'video' && i.checked)?.accessUrl ?? null)

const pubContent = ref('')
const pubBusy = ref(false)
const pubError = ref('')
const pubResult = ref<Moment | null>(null)
const pubTimeline = ref<PageResult<Moment> | null>(null)
const pubVisible = ref<boolean | null>(null)

async function publish() {
  pubError.value = ''
  pubResult.value = null
  pubTimeline.value = null
  pubVisible.value = null
  if (!pubContent.value.trim() && !pickedImages.value.length && !pickedVideo.value) {
    pubError.value = '文本与媒体至少填一项'
    return
  }
  pubBusy.value = true
  try {
    const created = await apiJson<Moment>('/api/admin/moments', {
      method: 'POST',
      body: {
        content: pubContent.value,
        images: pickedImages.value,
        audio: null,
        video: pickedVideo.value,
        location: null,
        lat: null,
        lng: null,
      },
    })
    pubResult.value = created
    // 发布成功后立即用公开时间线确认可见性
    await checkTimeline(true)
  } catch (err) {
    pubError.value = err instanceof Error ? err.message : '发布失败'
  } finally {
    pubBusy.value = false
  }
}

async function checkTimeline(quiet = false) {
  if (!quiet) {
    pubError.value = ''
    pubVisible.value = null
  }
  try {
    pubTimeline.value = await apiJson<PageResult<Moment>>('/api/v1/moments?page=1&size=5')
    pubVisible.value = pubResult.value
      ? pubTimeline.value.list.some(m => m.id === pubResult.value?.id)
      : null
  } catch (err) {
    if (!quiet) pubError.value = err instanceof Error ? err.message : '查询公开时间线失败'
  }
}
</script>

<style scoped>
.utest {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 16px 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.utest__head h1 {
  margin: 0 0 6px;
  font-size: 22px;
}

.utest__sub {
  margin: 0;
  font-size: 13px;
  color: var(--c-text-muted);
  line-height: 1.7;
}

.utest__sub code,
.utest-muted code,
.utest-result code {
  font-size: 12px;
  background: var(--c-bg-soft);
  border: 1px solid var(--c-border);
  border-radius: 4px;
  padding: 1px 5px;
}

.utest-card {
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  box-shadow: var(--shadow-card);
  padding: 16px 18px;
}

.utest-card__title {
  margin: 0 0 12px;
  font-size: 15px;
}

.utest-login {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.utest-login .field-input {
  flex: 1 1 160px;
}

.utest-authed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.utest-ok {
  margin: 0;
  font-size: 13px;
  color: var(--c-primary);
}

.utest-file {
  display: block;
  font-size: 13px;
  margin-bottom: 10px;
}

.utest-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.utest-bar {
  height: 8px;
  margin-top: 12px;
  border-radius: 4px;
  background: var(--c-bg-soft);
  overflow: hidden;
}

.utest-bar i {
  display: block;
  height: 100%;
  background: var(--c-primary);
  border-radius: 4px;
  transition: width 0.2s ease;
}

.utest-muted {
  margin: 8px 0 0;
  font-size: 12.5px;
  color: var(--c-text-muted);
  line-height: 1.7;
  word-break: break-all;
}

.utest-hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--c-primary);
  background: var(--c-primary-light);
  border-radius: 8px;
  padding: 8px 12px;
  line-height: 1.7;
}

.utest-result {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--c-border);
  font-size: 13px;
}

.utest-result p {
  margin: 0 0 8px;
  word-break: break-all;
}

.utest-preview {
  display: block;
  max-width: 280px;
  max-height: 200px;
  border-radius: 8px;
  border: 1px solid var(--c-border);
  margin-top: 8px;
}

.utest-audio {
  width: 100%;
  max-width: 420px;
  margin-top: 8px;
}

.utest-video {
  display: block;
  width: 100%;
  max-width: 560px;
  border-radius: 8px;
  border: 1px solid var(--c-border);
  margin-top: 8px;
  background: var(--c-bg-soft);
}

.utest-tag-resume {
  color: #d97706;
}

.utest-tag-fresh {
  color: var(--c-primary);
}

.utest-textarea {
  margin-top: 12px;
  resize: vertical;
}

.utest-media-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.utest-media-list label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
  flex-wrap: wrap;
}

.utest-media-list label.is-disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.utest-media-kind {
  flex: none;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid var(--c-border);
  background: var(--c-bg-soft);
}

.utest-media-name {
  font-weight: 600;
  word-break: break-all;
}

.utest-media-url {
  font-size: 12px;
  color: var(--c-text-muted);
  word-break: break-all;
}

.utest-pub-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.utest-timeline {
  margin: 8px 0 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 2;
}

.utest-timeline .is-mine {
  color: var(--c-primary);
  font-weight: 600;
}

.utest-debug-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.utest-debug-head .utest-card__title {
  margin: 0;
  flex: 1;
}

.utest-log {
  margin-top: 6px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-bg-card);
  font-size: 12.5px;
}

.utest-log.is-err {
  border-color: var(--c-danger);
}

.utest-log summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  cursor: pointer;
  user-select: none;
  min-width: 0;
}

.utest-log summary::-webkit-details-marker {
  display: none;
}

.utest-log-time {
  flex: none;
  color: var(--c-text-muted);
  font-variant-numeric: tabular-nums;
}

.utest-log-method {
  flex: none;
  min-width: 44px;
}

.utest-log-url {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11.5px;
  direction: rtl;
  text-align: left;
}

.utest-log-status {
  flex: none;
  color: var(--c-primary);
}

.utest-log.is-err .utest-log-status {
  color: var(--c-danger);
}

.utest-log-ms {
  flex: none;
  color: var(--c-text-muted);
  font-variant-numeric: tabular-nums;
}

.utest-log-note {
  margin: 0;
  padding: 8px 12px;
  font-size: 12.5px;
  color: var(--c-danger);
  border-top: 1px dashed var(--c-border);
}

.utest-log-detail {
  margin: 0;
  padding: 10px 12px;
  border-top: 1px dashed var(--c-border);
  background: var(--c-bg-soft);
  border-radius: 0 0 8px 8px;
  font-size: 11.5px;
  line-height: 1.6;
  overflow: auto;
  max-height: 320px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
