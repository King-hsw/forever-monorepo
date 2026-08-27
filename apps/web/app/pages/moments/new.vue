<template>
  <div class="newpage">
    <main class="newpage-main">
      <header class="newpage-head">
        <h1 class="newpage-head__title">发布动态</h1>
        <p class="newpage-head__sub">说说最近的事 ✍️</p>
      </header>

      <!-- 身份门槛：加载中 / 未登录 / 无权限 -->
      <div v-if="!ready" class="newpage-state">加载中…</div>
      <div v-else-if="!auth.isAuthenticated" class="newpage-state">
        <p>登录后才能发布</p>
        <NuxtLink to="/admin/login?redirect=/moments/new" class="btn btn--primary">去登录</NuxtLink>
      </div>
      <div v-else-if="!canPost" class="newpage-state">
        <p>无发布权限</p>
        <NuxtLink to="/moments" class="btn">返回动态</NuxtLink>
      </div>

      <form v-else class="newpage-card" @submit.prevent="submit">
        <!-- 文本：≤1000 字 -->
        <div class="newpage-field">
          <div class="newpage-field__body">
            <textarea
              v-model="content"
              class="newpage-textarea"
              rows="6"
              maxlength="1000"
              placeholder="此刻的想法，或最近发生的事…"
            />
            <span class="newpage-count" :class="{ 'is-limit': content.length >= 1000 }">{{ content.length }}/1000</span>
          </div>
        </div>

        <!-- 附件：图片 ≤9 / 音频 ≤1 / 视频 ≤1，选择后立即上传 -->
        <div class="newpage-field">
          <div class="newpage-attach__actions">
            <label class="btn newpage-attach__btn">
              📷 图片
              <input
                type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple
                class="newpage-file"
                @change="pick('image', $event)"
              >
            </label>
            <label class="btn newpage-attach__btn">
              🎵 音频
              <input
                type="file" accept="audio/mpeg,audio/mp4,audio/wav"
                class="newpage-file"
                @change="pick('audio', $event)"
              >
            </label>
            <label class="btn newpage-attach__btn">
              🎬 视频
              <input
                type="file" accept="video/mp4,video/webm"
                class="newpage-file"
                @change="pick('video', $event)"
              >
            </label>
          </div>

          <ul v-if="items.length" class="newpage-items">
            <li
              v-for="item in items"
              :key="item.id"
              class="newpage-item"
              :class="`newpage-item--${item.kind}`"
            >
              <img v-if="item.kind === 'image' && item.url" :src="item.url" class="newpage-item__thumb" alt="">
              <span v-else class="newpage-item__icon" aria-hidden="true">{{ item.kind === 'audio' ? '🎵' : '🎬' }}</span>
              <div class="newpage-item__info">
                <span class="newpage-item__name">{{ item.file.name }}</span>
                <span v-if="item.status === 'uploading'" class="newpage-item__status">上传中…</span>
                <span v-else-if="item.status === 'error'" class="newpage-item__status is-error">
                  上传失败
                  <button type="button" class="newpage-item__retry" @click="retry(item)">重试</button>
                </span>
                <span v-else class="newpage-item__size">{{ fmtSize(item.file.size) }}</span>
              </div>
              <button type="button" class="newpage-item__remove" :aria-label="`移除 ${item.file.name}`" @click="removeItem(item)">
                ×
              </button>
            </li>
          </ul>
          <p v-else class="newpage-hint">
            图片最多 9 张（单张 ≤5MB）、音频 1 个（≤20MB）、视频 1 个（≤100MB），可只发文字
          </p>
        </div>

        <!-- 地点：文本可随手填；「获取当前位置」走高德逆地理，失败不阻塞 -->
        <div class="newpage-field">
          <div class="newpage-loc__head">
            <span class="newpage-loc__label">地点（选填）</span>
            <button type="button" class="newpage-loc__btn" :disabled="locating" @click="getLocation">
              {{ locating ? '定位中…' : '📍 获取当前位置' }}
            </button>
          </div>
          <input
            v-model="locationText"
            type="text"
            class="field-input"
            maxlength="100"
            placeholder="如：杭州 · 西湖"
          >
        </div>

        <p v-if="noticeText" class="newpage-notice" aria-live="polite">{{ noticeText }}</p>
        <p v-if="error" class="newpage-notice is-error" role="alert">{{ error }}</p>

        <div class="newpage-submit">
          <button
            type="submit"
            class="btn btn--primary"
            :disabled="submitting || uploading"
          >
            {{ submitting ? '发布中…' : uploading ? '附件上传中…' : '发布' }}
          </button>
        </div>
      </form>
    </main>

    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useMomentsStore } from '~/stores/moments'
import { uploadFile } from '~/utils/upload'

usePageSeo({
  title: '发布动态 · 补陋阁',
  description: '发布一条动态：文字、图片、音频与视频，加上地点。',
  path: '/moments/new',
})

const auth = useAuthStore()
auth.hydrate()
const momentsStore = useMomentsStore()

const canPost = computed(() => auth.isAuthenticated && auth.hasPermission('moment:post'))
/** 登录态需拉权限码后才能判定，SSR 阶段先按加载态渲染 */
const ready = ref(!auth.isAuthenticated)
onMounted(async () => {
  if (auth.isAuthenticated)
    await auth.ensureMe()
  ready.value = true
})

/* ---------- 文本 ---------- */
const content = ref('')

/* ---------- 附件：选择后立即上传到 /api/admin/upload ---------- */
type AttachKind = 'image' | 'audio' | 'video'

interface AttachItem {
  id: number
  kind: AttachKind
  file: File
  status: 'uploading' | 'done' | 'error'
  url?: string
}

const MB = 1024 * 1024
const RULES: Record<AttachKind, { types: string[], max: number, maxCount: number }> = {
  image: { types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], max: 5 * MB, maxCount: 9 },
  audio: { types: ['audio/mpeg', 'audio/mp4', 'audio/wav'], max: 20 * MB, maxCount: 1 },
  video: { types: ['video/mp4', 'video/webm'], max: 100 * MB, maxCount: 1 },
}
const KIND_LABEL: Record<AttachKind, string> = { image: '图片', audio: '音频', video: '视频' }

const items = ref<AttachItem[]>([])
let seq = 0

const uploading = computed(() => items.value.some(i => i.status === 'uploading'))

function fmtSize(bytes: number): string {
  if (bytes >= MB)
    return `${(bytes / MB).toFixed(1)}MB`
  return `${Math.ceil(bytes / 1024)}KB`
}

/** 客户端校验：MIME 白名单 + 单文件大小 + 数量上限 */
const noticeText = ref('')
function notice(msg: string) {
  noticeText.value = msg
}

function pick(kind: AttachKind, event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return

  const rule = RULES[kind]
  const room = rule.maxCount - items.value.filter(i => i.kind === kind).length
  if (room <= 0) {
    notice(kind === 'image' ? '最多添加 9 张图片' : `${KIND_LABEL[kind]}只能上传 1 个`)
    return
  }

  for (const file of files.slice(0, room)) {
    if (!rule.types.includes(file.type)) {
      notice(`${KIND_LABEL[kind]}仅支持 ${rule.types.map(t => t.split('/')[1]).join(' / ')} 格式`)
      continue
    }
    if (file.size > rule.max) {
      notice(`${KIND_LABEL[kind]} ${file.name} 超过 ${rule.max / MB}MB 上限`)
      continue
    }
    const item = reactive<AttachItem>({ id: ++seq, kind, file, status: 'uploading' })
    items.value.push(item)
    void upload(item)
  }
  if (files.length > room)
    notice(`最多添加 ${rule.maxCount} 个${KIND_LABEL[kind]}`)
}

async function upload(item: AttachItem) {
  item.status = 'uploading'
  try {
    item.url = await uploadFile(item.file)
    item.status = 'done'
  }
  catch {
    item.status = 'error'
  }
}

function retry(item: AttachItem) {
  void upload(item)
}

function removeItem(item: AttachItem) {
  items.value = items.value.filter(i => i.id !== item.id)
}

/* ---------- 地点：高德逆地理（留空降级），经纬度随表单提交 ---------- */
const locationText = ref('')
const geo = ref<{ lat: number, lng: number } | null>(null)
const locating = ref(false)

function round(value: number): number {
  return Number(value.toFixed(7))
}

function getLocation() {
  if (locating.value) return
  if (!('geolocation' in navigator)) {
    notice('当前浏览器不支持定位，请手动填写地点')
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    async position => {
      const { latitude: lat, longitude: lng } = position.coords
      geo.value = { lat: round(lat), lng: round(lng) }
      try {
        const res = await apiFetch<{ text: string | null }>('/api/v1/moments/geocode', {
          query: { lat, lng },
        })
        if (res.text)
          locationText.value = res.text
        else
          notice('已记录经纬度，地点文本可手动补充')
      }
      catch {
        notice('地点解析失败（不影响发布），可手动填写')
      }
      finally {
        locating.value = false
      }
    },
    () => {
      locating.value = false
      notice('定位失败，可手动填写地点')
    },
    { timeout: 10_000 },
  )
}

/* ---------- 提交：内容或媒体至少其一 ---------- */
const submitting = ref(false)
const error = ref('')

async function submit() {
  if (submitting.value || uploading.value) return
  const text = content.value.trim()
  const images = items.value.filter(i => i.kind === 'image' && i.status === 'done').map(i => i.url!)
  const audio = items.value.find(i => i.kind === 'audio' && i.status === 'done')
  const video = items.value.find(i => i.kind === 'video' && i.status === 'done')
  if (!text && !images.length && !audio && !video) {
    error.value = '写点什么，或添加图片 / 音频 / 视频'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await momentsStore.createMoment({
      content: text,
      images,
      audio: audio?.url ?? null,
      video: video?.url ?? null,
      location: locationText.value.trim() || null,
      lat: geo.value?.lat ?? null,
      lng: geo.value?.lng ?? null,
    })
    await navigateTo('/moments')
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : '发布失败，请稍后再试'
  }
  finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.newpage {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.newpage-main {
  flex: 1;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 96px 20px 56px;
}

.newpage-head {
  margin-bottom: 20px;
}

.newpage-head__title {
  margin: 0;
  font-size: 28px;
}

.newpage-head__sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--c-text-muted);
}

.newpage-state {
  padding: 32px 0;
  font-size: 14px;
  color: var(--c-text-secondary);
  text-align: center;

  .btn {
    display: inline-block;
    margin-top: 12px;
  }
}

.newpage-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 720px;
  padding: 24px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.newpage-field__body {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.newpage-textarea {
  width: 100%;
  min-height: 160px;
  padding: 14px 16px;
  font-size: 15px;
  font-family: var(--font-sans);
  line-height: 1.7;
  color: var(--c-text);
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  outline: none;
  transition: border-color var(--dur-soft) ease, box-shadow var(--dur-soft) ease;

  &:focus {
    border-color: var(--c-primary);
    box-shadow: 0 0 0 3px var(--c-primary-light);
  }
}

.newpage-count {
  font-size: 12px;
  color: var(--c-text-muted);

  &.is-limit {
    color: var(--c-danger);
    font-weight: 600;
  }
}

/* ===== 附件 ===== */
.newpage-attach__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.newpage-attach__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.newpage-file {
  display: none;
}

.newpage-hint {
  margin: 12px 0 0;
  font-size: 12.5px;
  color: var(--c-text-muted);
}

.newpage-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.newpage-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px 8px 8px;
  background: var(--c-bg-soft);
  border: 1px solid var(--c-border);
  border-radius: 12px;
}

.newpage-item__thumb {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 10px;
  background: var(--c-bg-soft);
}

.newpage-item__icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  font-size: 26px;
  background: var(--c-bg-soft);
  border-radius: 10px;
}

.newpage-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.newpage-item__name {
  font-size: 13px;
  color: var(--c-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.newpage-item__status {
  font-size: 12px;
  color: var(--c-text-muted);

  &.is-error {
    color: var(--c-danger);
  }
}

.newpage-item__retry {
  margin-left: 8px;
  padding: 0;
  font-size: 12px;
  color: var(--c-primary);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
}

.newpage-item__size {
  font-size: 12px;
  color: var(--c-text-muted);
}

.newpage-item__remove {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  font-size: 14px;
  color: var(--c-text-muted);
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: color var(--dur-soft) ease, background-color var(--dur-soft) ease;
}

.newpage-item__remove:hover {
  color: var(--c-danger);
  background: rgb(220 38 38 / 8%);
}

/* ===== 地点 ===== */
.newpage-loc__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.newpage-loc__label {
  font-size: 13px;
  color: var(--c-text-secondary);
}

.newpage-loc__btn {
  padding: 0;
  font-size: 13px;
  color: var(--c-primary);
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--dur-soft) ease;

  &:hover:not(:disabled) {
    color: var(--c-primary-hover);
  }

  &:disabled {
    color: var(--c-text-muted);
    cursor: default;
  }
}

.newpage-notice {
  margin: 0;
  font-size: 13px;
  color: var(--c-text-secondary);

  &.is-error {
    color: var(--c-danger);
  }
}

.newpage-submit {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
  border-top: 1px solid var(--c-border);
}

@media (max-width: 640px) {
  .newpage-main {
    padding-top: 88px;
  }

  .newpage-card {
    padding: 16px;
  }

  .newpage-head__title {
    font-size: 24px;
  }
}
</style>
