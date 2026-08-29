<template>
  <div class="newpage">
    <main class="newpage-main">
      <header class="newpage-head">
        <h1 class="newpage-head__title">发布动态</h1>
        <p class="newpage-head__sub">说说最近的事 <Icon name="lucide:pen-line" /></p>
      </header>

      <form class="composer" @submit.prevent="submit">
        <!-- 作者：头像 + 昵称 -->
        <div class="composer__author">
          <!-- 头像加载失败时由 SafeImage 渲染首字占位（带 --initial 类，与无头像时一致） -->
          <SafeImage
            v-if="profile?.avatarUrl"
            class="composer__avatar composer__avatar--initial"
            :src="profile.avatarUrl"
            :alt="auth.username ?? ''"
            :fallback-text="initialOf(auth.username ?? '?')"
            variant="avatar"
          />
          <span
            v-else
            class="composer__avatar"
            :class="auth.isAuthenticated ? 'composer__avatar--initial' : 'composer__avatar--guest'"
            aria-hidden="true"
          >
            {{ auth.isAuthenticated ? initialOf(auth.username ?? '?') : '游' }}
          </span>
          <span class="composer__name">
            <template v-if="auth.isAuthenticated">{{ auth.username }}</template>
            <template v-else>未登录 · <NuxtLink to="/admin/login?redirect=/moments/new">去登录</NuxtLink></template>
          </span>
        </div>

        <!-- 文本 -->
        <textarea
          v-model="content"
          class="composer__textarea"
          maxlength="1000"
          placeholder="此刻的想法，或最近发生的事…"
        ></textarea>
        <div class="composer__count-row">
          <span class="composer__count" :class="{ 'is-limit': content.length >= 1000 }">{{ content.length }}/1000</span>
        </div>

        <!-- 图片九宫格：选择即上传，本地 objectURL 预览，完成前显示进度条 -->
        <div v-if="imageItems.length" class="composer__images">
          <div
            v-for="item in imageItems"
            :key="item.id"
            class="composer__image"
            :class="{ 'is-error': item.status === 'error' }"
            :title="item.status === 'error' ? item.error : undefined"
          >
            <img v-if="item.previewUrl" :src="item.previewUrl" :alt="item.file.name">
            <span v-else class="composer__image__ph">{{ item.status === 'error' ? '上传失败' : '上传中…' }}</span>
            <span v-if="item.status === 'uploading'" class="composer__image__bar" aria-hidden="true">
              <i :style="{ width: `${item.progress}%` }"></i>
            </span>
            <span v-if="item.status === 'error'" class="composer__image__retry">
              <button type="button" @click="retry(item)">重试</button>
            </span>
            <button
              type="button"
              class="composer__image__rm"
              :aria-label="`移除 ${item.file.name}`"
              @click="removeItem(item)"
            >
              ×
            </button>
          </div>
        </div>

        <!-- 音频 / 视频：单行小卡片（最多各 1 个） -->
        <div
          v-for="item in mediaItems"
          :key="item.id"
          class="composer__media"
        >
          <span class="composer__media__icon" aria-hidden="true">
            <Icon :name="item.kind === 'audio' ? 'lucide:music' : 'lucide:clapperboard'" />
          </span>
          <div class="composer__media__info">
            <span class="composer__media__name">{{ item.file.name }}</span>
            <span v-if="item.status === 'uploading'" class="composer__media__status">上传中 {{ item.progress }}%</span>
            <span v-else-if="item.status === 'error'" class="composer__media__status is-error">
              <span class="composer__media__errmsg" :title="item.error">{{ item.error ?? '上传失败' }}</span>
              <button type="button" class="composer__media__retry" @click="retry(item)">重试</button>
            </span>
            <span v-else class="composer__media__status">{{ fmtSize(item.file.size) }}</span>
          </div>
          <span v-if="item.status === 'uploading'" class="composer__media__bar" aria-hidden="true">
            <i :style="{ width: `${item.progress}%` }"></i>
          </span>
          <button
            type="button"
            class="composer__media__rm"
            :aria-label="`移除 ${item.file.name}`"
            @click="removeItem(item)"
          >
            ×
          </button>
        </div>

        <!-- 底部工具条：图片 / 音频 / 视频 / 位置 + 发布 -->
        <div class="composer__bar">
          <label class="composer__tool">
            <Icon name="lucide:camera" /> 图片
            <input
              type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple
              class="composer__file"
              @change="pick('image', $event)"
            >
          </label>
          <label class="composer__tool">
            <Icon name="lucide:music" /> 音频
            <input
              type="file" accept="audio/mpeg,audio/mp4,audio/wav"
              class="composer__file"
              @change="pick('audio', $event)"
            >
          </label>
          <label class="composer__tool">
            <Icon name="lucide:clapperboard" /> 视频
            <input
              type="file" accept="video/mp4,video/webm"
              class="composer__file"
              @change="pick('video', $event)"
            >
          </label>
          <button
            type="button"
            class="composer__tool"
            :class="{ 'is-active': showLocation }"
            @click="showLocation = !showLocation"
          >
            <Icon name="lucide:map-pin" /> 位置
          </button>

          <button
            type="submit"
            class="composer__post"
            :disabled="submitting || uploading"
          >
            {{ !auth.isAuthenticated ? '登录后发布' : submitting ? '发布中…' : uploading ? '附件上传中…' : '发布' }}
          </button>
        </div>

        <!-- 地点行：工具条「位置」展开；经纬度随表单提交 -->
        <div v-if="showLocation" class="composer__location">
          <input
            v-model="locationText"
            type="text"
            class="composer__location-input"
            maxlength="100"
            placeholder="如：杭州 · 西湖"
          >
          <button type="button" class="composer__location-btn" :disabled="locating" @click="getLocation">
            <Icon v-if="!locating" name="lucide:locate-fixed" /> {{ locating ? '定位中…' : '获取当前位置' }}
          </button>
        </div>

        <p v-if="noticeText" class="composer__notice" aria-live="polite">{{ noticeText }}</p>
        <p v-if="error" class="composer__notice is-error" role="alert">{{ error }}</p>
        <p class="composer__hint">
          图片最多 9 张（单张 ≤5MB）、音频 1 个（≤20MB）、视频 1 个（≤100MB），可只发文字
        </p>
      </form>
    </main>

    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import type { ProfileInfo } from '#shared/types'
import { useAuthStore } from '~/stores/auth'
import { useMomentsStore } from '~/stores/moments'
import { initialOf } from '~/utils/format'
import { presignAndUpload, UPLOAD_RULES } from '~/utils/uploadService'
import type { UploadKind } from '~/utils/uploadService'

usePageSeo({
  title: '发布动态 · 补陋阁',
  description: '发布一条动态：文字、图片、音频与视频，加上地点。',
  path: '/moments/new',
})

const auth = useAuthStore()
auth.hydrate()
const momentsStore = useMomentsStore()

/** 作者头像：取登录用户资料（自定义头像 / Gravatar）；未登录 / 失败兜底首字头像 */
const profile = ref<ProfileInfo | null>(null)
onMounted(async () => {
  if (auth.isAuthenticated)
    profile.value = await apiFetch<ProfileInfo>('/api/admin/profile').catch(() => null)
})

/* ---------- 文本 ---------- */
const content = ref('')

/* ---------- 附件：选择后直传 RustFS（presigned PUT），本地预览用 objectURL ---------- */
interface AttachItem {
  id: number
  kind: UploadKind
  file: File
  status: 'uploading' | 'done' | 'error'
  /** 上传进度 0-100 */
  progress: number
  /** 本地预览地址（URL.createObjectURL）；tmp key 不是可访问地址，不能拿来预览 */
  previewUrl?: string
  /** 上传成功后的 tmp key（回退模式为正式地址），提交时填进 images / audio / video */
  key?: string
  /** 失败原因（令牌过期 / 非 0 code / 网络错误） */
  error?: string
}

const MB = 1024 * 1024
const KIND_LABEL: Record<UploadKind, string> = { image: '图片', audio: '音频', video: '视频' }

const items = ref<AttachItem[]>([])
let seq = 0

const imageItems = computed(() => items.value.filter(i => i.kind === 'image'))
const mediaItems = computed(() => items.value.filter(i => i.kind !== 'image'))
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

function pick(kind: UploadKind, event: Event) {
  if (!auth.isAuthenticated) {
    notice('登录后才能添加附件')
    return
  }
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return

  const rule = UPLOAD_RULES[kind]
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
    const item = reactive<AttachItem>({
      id: ++seq,
      kind,
      file,
      status: 'uploading',
      progress: 0,
      previewUrl: kind === 'image' ? URL.createObjectURL(file) : undefined,
    })
    items.value.push(item)
    void upload(item)
  }
  if (files.length > room)
    notice(`最多添加 ${rule.maxCount} 个${KIND_LABEL[kind]}`)
}

async function upload(item: AttachItem) {
  item.status = 'uploading'
  item.progress = 0
  item.error = undefined
  try {
    const media = await presignAndUpload(item.file, {
      onProgress: (percent) => {
        item.progress = percent
      },
    })
    item.key = media.key
    item.status = 'done'
  }
  catch (err) {
    item.status = 'error'
    item.error = errMsg(err, '上传失败，请重试')
  }
}

function retry(item: AttachItem) {
  void upload(item)
}

function removeItem(item: AttachItem) {
  if (item.previewUrl)
    URL.revokeObjectURL(item.previewUrl)
  items.value = items.value.filter(i => i.id !== item.id)
}

onBeforeUnmount(() => {
  for (const item of items.value) {
    if (item.previewUrl)
      URL.revokeObjectURL(item.previewUrl)
  }
})

/* ---------- 地点：高德逆地理（留空降级），经纬度随表单提交 ---------- */
const locationText = ref('')
const showLocation = ref(false)
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
  if (!auth.isAuthenticated) {
    await navigateTo('/admin/login?redirect=/moments/new')
    return
  }
  const text = content.value.trim()
  // 提交 tmp key（回退模式为正式地址），后端收口为 /uploads/moment/... 正式地址
  const images = items.value.filter(i => i.kind === 'image' && i.status === 'done').map(i => i.key!)
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
      audio: audio?.key ?? null,
      video: video?.key ?? null,
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

/* ===== composer：朋友圈式发布卡片 ===== */
.composer {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 720px;
  padding: 22px 24px 18px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

/* 作者 */
.composer__author {
  display: flex;
  align-items: center;
  gap: 10px;
}

.composer__avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.composer__avatar--initial {
  font-size: 16px;
  font-weight: 600;
  color: var(--c-on-primary);
  background: var(--c-primary);
}

.composer__avatar--guest {
  font-size: 16px;
  font-weight: 600;
  color: var(--c-text-secondary);
  background: var(--c-bg-soft);
}

.composer__name a {
  color: var(--c-primary);
  font-weight: 600;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.composer__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--c-text);
}

/* 文本 */
.composer__textarea {
  width: 100%;
  min-height: 110px;
  padding: 12px 14px;
  font-size: 15px;
  font-family: var(--font-sans);
  line-height: 1.7;
  color: var(--c-text);
  background: var(--c-bg-soft);
  border: 1px solid transparent;
  border-radius: 14px;
  outline: none;
  resize: vertical;
  field-sizing: content;
  transition:
    border-color var(--dur-soft) ease,
    box-shadow var(--dur-soft) ease,
    background-color var(--dur-soft) ease;

  &:focus {
    background: var(--c-bg-card);
    border-color: var(--c-primary);
    box-shadow: 0 0 0 3px var(--c-primary-light);
  }
}

.composer__count-row {
  display: flex;
  justify-content: flex-end;
  margin-top: -8px;
}

.composer__count {
  font-size: 12px;
  color: var(--c-text-muted);

  &.is-limit {
    color: var(--c-danger);
    font-weight: 600;
  }
}

/* 图片九宫格：限宽，单张缩略约 84px，九张也只占三行小图 */
.composer__images {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  max-width: 268px;
}

.composer__image {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  background: var(--c-bg-soft);

  &.is-error {
    background: rgb(220 38 38 / 6%);
  }
}

.composer__image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.composer__image__ph {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--c-text-muted);
}

.composer__image.is-error .composer__image__ph {
  color: var(--c-danger);
}

/* 直传进度条：贴格子底部 */
.composer__image__bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgb(0 0 0 / 22%);

  i {
    display: block;
    height: 100%;
    background: var(--c-primary);
    transition: width 0.2s ease;
  }
}

.composer__image__retry {
  position: absolute;
  bottom: 6px;
  left: 0;
  right: 0;
  text-align: center;

  button {
    padding: 0;
    font-size: 12px;
    color: var(--c-primary);
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: underline;
  }
}

.composer__image__rm {
  position: absolute;
  top: 6px;
  right: 6px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  font-size: 14px;
  line-height: 1;
  color: #fff;
  background: rgb(0 0 0 / 45%);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color var(--dur-soft) ease;

  &:hover {
    background: rgb(0 0 0 / 65%);
  }
}

/* 音频 / 视频小卡片 */
.composer__media {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px 8px 8px;
  background: var(--c-bg-soft);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  overflow: hidden;
}

.composer__media__icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  font-size: 26px;
  background: var(--c-bg-card);
  border-radius: 10px;
}

.composer__media__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.composer__media__name {
  font-size: 13px;
  color: var(--c-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composer__media__status {
  font-size: 12px;
  color: var(--c-text-muted);

  &.is-error {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: var(--c-danger);
  }
}

.composer__media__errmsg {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composer__media__bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgb(0 0 0 / 12%);

  i {
    display: block;
    height: 100%;
    background: var(--c-primary);
    transition: width 0.2s ease;
  }
}

.composer__media__retry {
  margin-left: 8px;
  padding: 0;
  font-size: 12px;
  color: var(--c-primary);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
}

.composer__media__rm {
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

  &:hover {
    color: var(--c-danger);
    background: rgb(220 38 38 / 8%);
  }
}

/* ===== 底部工具条 ===== */
.composer__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--c-border);
}

.composer__tool {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  font-size: 13px;
  color: var(--c-text-secondary);
  background: none;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition:
    color var(--dur-soft) ease,
    background-color var(--dur-soft) ease;

  &:hover,
  &.is-active {
    color: var(--c-primary-hover);
    background: var(--c-primary-light);
  }
}

.composer__file {
  display: none;
}

.composer__post {
  margin-left: auto;
  padding: 8px 30px;
  font-size: 14px;
  font-weight: 600;
  color: var(--c-on-primary);
  background: var(--c-primary);
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color var(--dur-soft) ease, opacity var(--dur-soft) ease;

  &:hover:not(:disabled) {
    background: var(--c-primary-hover);
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
}

/* 地点行 */
.composer__location {
  display: flex;
  gap: 8px;

  .composer__location-input {
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
    font-size: 13.5px;
    color: var(--c-text);
    background: var(--c-bg-soft);
    border: 1px solid var(--c-border);
    border-radius: 10px;
    outline: none;
    transition: border-color var(--dur-soft) ease, box-shadow var(--dur-soft) ease;

    &:focus {
      border-color: var(--c-primary);
      box-shadow: 0 0 0 3px var(--c-primary-light);
    }
  }
}

.composer__location-btn {
  flex-shrink: 0;
  padding: 0 14px;
  font-size: 13px;
  color: var(--c-primary);
  background: none;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  cursor: pointer;
  transition:
    color var(--dur-soft) ease,
    border-color var(--dur-soft) ease;

  &:hover:not(:disabled) {
    color: var(--c-primary-hover);
    border-color: var(--c-primary);
  }

  &:disabled {
    color: var(--c-text-muted);
    cursor: default;
  }
}

.composer__notice {
  margin: 0;
  font-size: 13px;
  color: var(--c-text-secondary);

  &.is-error {
    color: var(--c-danger);
  }
}

.composer__hint {
  margin: 0;
  font-size: 12.5px;
  color: var(--c-text-muted);
}

@media (max-width: 640px) {
  .newpage-main {
    padding-top: 88px;
  }

  .composer {
    padding: 16px 14px 12px;
  }

  .newpage-head__title {
    font-size: 24px;
  }

  .composer__post {
    width: 100%;
    margin-left: 0;
  }
}
</style>
