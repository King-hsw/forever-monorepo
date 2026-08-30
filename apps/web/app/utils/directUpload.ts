/**
 * 文件直传测试支撑模块：assetId 生命周期管理 + 直传 / 分片 / 断点续传编排
 *
 * 测试页的请求逻辑全部收在这里，页面组件只调 createUploader(能力) 后的
 * uploadOne / uploadMultipart：
 * - 上传能力（UploadCapability）由组件声明：支持什么格式、每类多大、哪个 scene；
 *   预检、文件选择器 accept、presign/init 的 scene 均从能力派生；
 * - 测试页独立的登录令牌存取（localStorage 专属 key，不与后台管理会话互相影响）；
 * - 后端信封请求解包（code !== 0 一律视为失败，抛 ApiError）；
 * - 单文件直传：presign → XHR PUT 裸二进制（403 视为签名过期，重签后重试一次）；
 * - 大文件分片：init → 按返回的 partSize 切片、并发 3 逐片 PUT → complete；
 * - 断点续传：assetId 按 fingerprint 存 IndexedDB，init 成功后写入、
 *   complete / 取消成功后清除；重选同一文件先 resume 对账只补缺失分片，
 *   resume 返回 404 视为会话失效，清记录后回退全新 init。
 *
 * 硬性约束（与签名相关，违反即 403）：
 * - PUT 一律裸二进制 + 仅 Content-Type 一个自定义头，不带 Authorization / cookie；
 * - Content-Type 与预签返回值逐字符一致；
 * - 分片大小与分片数完全以后端 init / resume 返回为准，前端不自定；
 * - 不读不回传 ETag，complete 由后端 listParts 核对。
 */
import { ApiError } from '~/utils/api'
import type { ApiResponse } from '#shared/types'

const MB = 1024 * 1024

/* ========== 调试日志：页面订阅后统一进调试面板 ========== */

export interface UploadLogEntry {
  /** 发起时间（毫秒时间戳） */
  time: number
  method: string
  /** 完整目标地址；PUT 应为 RustFS 直链而非后端地址 */
  url: string
  /** HTTP 状态码；0 表示网络层失败（CORS / 断网 / 域名不可达） */
  status: number
  durationMs: number
  /** 请求 / 响应详情（PUT 的二进制 body 以占位说明代替） */
  detail?: { request?: unknown; response?: unknown }
  note?: string
}

const logListeners = new Set<(entry: UploadLogEntry) => void>()

/** 订阅模块内所有请求日志（含页面自己的 apiJson 调用），返回退订函数 */
export function onUploadLog(cb: (entry: UploadLogEntry) => void): () => void {
  logListeners.add(cb)
  return () => logListeners.delete(cb)
}

function emitLog(entry: UploadLogEntry) {
  logListeners.forEach(cb => cb(entry))
}

/* ========== 测试页登录令牌（独立存储，不与后台共用） ========== */

const AUTH_KEY = 'forever-upload-test-auth'

export interface UploadAuth {
  token: string
  username: string
  savedAt: number
}

export function loadUploadAuth(): UploadAuth | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<UploadAuth>
    return value.token ? (value as UploadAuth) : null
  } catch {
    return null
  }
}

export function saveUploadAuth(auth: UploadAuth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
}

export function clearUploadAuth() {
  localStorage.removeItem(AUTH_KEY)
}

function getUploadToken(): string {
  return loadUploadAuth()?.token ?? ''
}

/* ========== 后端信封请求 ========== */

interface ApiJsonOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  /** 显式覆盖令牌；登录接口传空字符串避免携带旧令牌 */
  token?: string
}

/**
 * 发起后端请求并解包统一信封：code !== 0 或 HTTP 层错误一律抛 ApiError
 * （code 存 HTTP 状态码，网络层失败为 0），message 已适合直接展示。
 * 每次调用自动写入调试日志（Authorization 头不记录）。
 */
export async function apiJson<T>(path: string, options: ApiJsonOptions = {}): Promise<T> {
  const base = useRuntimeConfig().public.apiBase as string
  const token = options.token ?? getUploadToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const started = Date.now()
  const url = `${base}${path}`
  const method = options.method ?? 'GET'
  let status = 0
  let responseBody: unknown
  try {
    // $fetch.raw + ignoreResponseError：错误状态不抛出，状态码与信封错误体统一在下方处理；
    // 走到下方 catch 的就只剩真正的网络层失败（断网 / 代理未启动 / 跨域拦截）
    const res = await $fetch.raw<ApiResponse<T>>(url, {
      method,
      body: options.body as never,
      headers,
      ignoreResponseError: true,
    })
    status = res.status
    responseBody = res._data
    const envelope = res._data
    if (!envelope || typeof envelope !== 'object' || envelope.code !== 0) {
      throw new ApiError(envelope?.message || `请求失败（HTTP ${status}）`, status)
    }
    emitLog({ time: started, method, url, status, durationMs: Date.now() - started, detail: { request: options.body, response: responseBody } })
    return envelope.data
  } catch (err) {
    if (err instanceof ApiError) {
      emitLog({ time: started, method, url, status, durationMs: Date.now() - started, detail: { request: options.body, response: responseBody }, note: err.message })
      throw err
    }
    // 网络层失败：断网 / 代理未启动；PUT 打到 RustFS 时多为跨域被拦
    const note = err instanceof Error ? err.message : '网络请求失败'
    emitLog({ time: started, method, url, status: 0, durationMs: Date.now() - started, detail: { request: options.body }, note })
    throw new ApiError(`网络请求失败（${note}）`, 0)
  }
}

/* ========== 上传能力：组件声明自己支持什么格式与大小 ========== */

export type MediaKind = 'image' | 'audio' | 'video'

/** 组件支持的一种媒体类别：格式与大小上限由使用方（组件）声明 */
export interface MediaKindRule {
  kind: MediaKind
  /** 展示用名称：图片 / 音频 / 视频 */
  label: string
  /** 允许的 MIME，参与签名与 input[accept] 生成 */
  mimes: string[]
  /** 扩展名兜底（浏览器对 m4a 等的 MIME 不稳定），生成 accept 时转 .ext */
  exts: string[]
  /** 该类别大小上限（字节），组件自定 */
  maxBytes: number
}

/** 上传能力：一个上传组件（业务位）支持的 scene、格式与大小，全部由组件声明；
 *  预检、文件选择器 accept、presign/init 的 scene 都从这里派生 */
export interface UploadCapability {
  /** 业务场景：presign / multipart init 的 scene 参数 */
  scene: string
  kinds: MediaKindRule[]
}

/** 动态媒体三类规则（与后端契约白名单一致），组件按需自由组合 */
export const IMAGE_RULE: MediaKindRule = { kind: 'image', label: '图片', mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], exts: ['jpg', 'jpeg', 'png', 'webp', 'gif'], maxBytes: 5 * MB }
export const AUDIO_RULE: MediaKindRule = { kind: 'audio', label: '音频', mimes: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav'], exts: ['mp3', 'm4a', 'wav'], maxBytes: 20 * MB }
export const VIDEO_RULE: MediaKindRule = { kind: 'video', label: '视频', mimes: ['video/mp4', 'video/webm'], exts: ['mp4', 'webm'], maxBytes: 100 * MB }
export const MOMENT_KINDS: MediaKindRule[] = [IMAGE_RULE, AUDIO_RULE, VIDEO_RULE]

/** 字节数格式化（预检提示与页面展示共用） */
export function fmtBytes(n: number): string {
  if (n >= MB) return `${(n / MB).toFixed(1).replace(/\.0$/, '')}MB`
  if (n >= 1024) return `${Math.round(n / 1024)}KB`
  return `${n}B`
}

/** 由能力生成文件选择器的 accept 属性（MIME + .扩展名） */
export function acceptOf(capability: UploadCapability): string {
  const parts: string[] = []
  for (const rule of capability.kinds) parts.push(...rule.mimes, ...rule.exts.map(ext => `.${ext}`))
  return parts.join(',')
}

function ruleOf(file: File, capability: UploadCapability): MediaKindRule | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return capability.kinds.find(r => r.mimes.includes(file.type) || r.exts.includes(ext)) ?? null
}

/** 文件属于能力中的哪一类；不在能力内返回 null */
export function fileKindOf(file: File, capability: UploadCapability): MediaKind | null {
  return ruleOf(file, capability)?.kind ?? null
}

/** 按组件能力预检：通过返回 null；否则返回可直接展示的拦截原因（此时不应发任何请求） */
export function precheckFile(file: File, capability: UploadCapability): string | null {
  if (!file.size) return '空文件无法上传'
  const rule = ruleOf(file, capability)
  if (!rule) {
    const supported = capability.kinds.map(r => `${r.label} ${r.exts.join('/')}`).join('、')
    return `本组件不支持的文件类型（仅支持：${supported}），已拦截，未发起任何请求`
  }
  if (file.size > rule.maxBytes) {
    return `${rule.label}超过 ${fmtBytes(rule.maxBytes)} 限制（当前 ${fmtBytes(file.size)}），已拦截，未发起任何请求`
  }
  return null
}

/* ========== XHR PUT：裸二进制 + 单 Content-Type 头 ========== */

interface PutOptions {
  /** 已上传字节数（fetch 拿不到上传进度，统一走 XHR） */
  onLoaded?: (loaded: number) => void
  /** 任一信号中止即 xhr.abort() */
  signals?: AbortSignal[]
}

/**
 * PUT 文件原始二进制到对象存储（RustFS 预签地址）。
 * 成功 = 2xx + 空 body；403 = 签名过期（由调用方决定重签策略）；
 * onerror 多为 RustFS 未配 CORS 或 endpoint 不可达，属后端环境问题。
 */
function putBlob(url: string, contentType: string, blob: Blob, options: PutOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (options.signals?.some(s => s.aborted)) {
      reject(new DOMException('上传已中止', 'AbortError'))
      return
    }
    const started = Date.now()
    const xhr = new XMLHttpRequest()
    const detail = () => ({ request: { headers: { 'Content-Type': contentType }, body: `（裸二进制 ${blob.size} 字节）` } })
    const onAbort = () => xhr.abort()
    options.signals?.forEach(s => s.addEventListener('abort', onAbort))
    const cleanup = () => options.signals?.forEach(s => s.removeEventListener('abort', onAbort))

    xhr.open('PUT', url)
    // 参与签名：值必须与预签返回的 contentType 逐字符一致，不得追加 charset 等后缀
    xhr.setRequestHeader('Content-Type', contentType)
    // 预签地址自带授权：绝不携带 cookie / Authorization
    xhr.withCredentials = false
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) options.onLoaded?.(e.loaded)
    }
    xhr.onload = () => {
      cleanup()
      emitLog({ time: started, method: 'PUT', url, status: xhr.status, durationMs: Date.now() - started, detail: { ...detail(), response: xhr.responseText || '（空）' } })
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new ApiError(`直传失败（HTTP ${xhr.status}）`, xhr.status))
      }
    }
    xhr.onerror = () => {
      cleanup()
      const note = '直传网络错误：多为 RustFS 未配 CORS 或 storage.endpoint 不可达，属后端环境问题，需后端排查'
      emitLog({ time: started, method: 'PUT', url, status: 0, durationMs: Date.now() - started, detail: detail(), note })
      reject(new ApiError(note, 0))
    }
    xhr.onabort = () => {
      cleanup()
      reject(new DOMException('上传已中止', 'AbortError'))
    }
    xhr.send(blob)
  })
}

/* ========== IndexedDB：assetId 会话记录（断点续传对账用） ========== */

export interface UploadRecord {
  /** 指纹 `${fileName}:${file.size}:${file.lastModified}`，主键 */
  fingerprint: string
  assetId: number
  key: string
  uploadId?: string
  partSize: number
  partCount: number
  contentType: string
  fileName: string
  fileSize: number
  createdAt: number
}

const DB_NAME = 'forever-upload-test'
const STORE = 'uploads'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'fingerprint' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB 打开失败'))
  })
}

async function idbRun<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = run(tx.objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error('IndexedDB 操作失败'))
    })
  } finally {
    db.close()
  }
}

const idbGet = (fingerprint: string) => idbRun('readonly', s => s.get(fingerprint) as IDBRequest<UploadRecord | undefined>)
const idbPut = (record: UploadRecord) => idbRun('readwrite', s => s.put(record))
const idbDel = (fingerprint: string) => idbRun('readwrite', s => s.delete(fingerprint) as IDBRequest<undefined>)

/** 查询某文件指纹的未完成会话记录（页面用于选择后提示，模块用于 resume 对账） */
export function getUploadRecord(fingerprint: string): Promise<UploadRecord | undefined> {
  if (!import.meta.client) return Promise.resolve(undefined)
  return idbGet(fingerprint).catch(() => undefined)
}

/** fingerprint = 文件名:字节数:最后修改时间 */
export function fingerprintOf(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

/* ========== 接口契约（对应 forever-server 直传接口） ========== */

/** POST /api/admin/upload/presign 的 data */
interface PresignData {
  assetId: number
  key: string
  uploadUrl: string
  accessUrl: string
  contentType: string
  expiresIn: number
}

/** POST /api/admin/upload/multipart/init 的 data */
interface MultipartInitData {
  assetId: number
  key: string
  uploadId: string
  partSize: number
  partCount: number
  partUrls: string[]
  accessUrl: string
  contentType: string
  expiresIn: number
}

/** POST /api/admin/upload/multipart/resume 的 data（契约"…"处可能带 init 其余字段，按可选兜底） */
interface MultipartResumeData {
  /** 已传分片号（1 起） */
  uploadedParts: number[]
  partUrls: string[]
  partSize: number
  partCount: number
  assetId?: number
  key?: string
  contentType?: string
}

/** POST /api/admin/upload/multipart/complete 的 data */
interface MultipartCompleteData {
  assetId: number
  key: string
  accessUrl: string
  sizeBytes: number
}

export interface UploadOneResult {
  assetId: number
  key: string
  accessUrl: string
  contentType: string
}

export interface UploadMultipartResult {
  assetId: number
  key: string
  accessUrl: string
  sizeBytes: number
}

/** 会话建立（init 或 resume 对账）时回调给页面 */
export interface ResumeInfo {
  assetId: number
  /** 服务端已确认的分片号（1 起）；全新会话为空数组 */
  uploadedParts: number[]
  /** true = 命中本地记录并成功对账，false = 全新 init */
  resumed: boolean
  /** 后端定的分片大小与分片数 */
  partSize: number
  partCount: number
}

export interface UploadHooks {
  /** 业务场景（presign / init 的 scene，默认 'moment'）；createUploader 按能力注入 */
  scene?: string
  /** 触发即放弃整个上传：DELETE 服务端档案并清本地记录 */
  cancelSignal?: AbortSignal
  /** 触发即停发剩余分片，但保留服务端会话与本地记录（模拟中断用） */
  interruptSignal?: AbortSignal
  /** 会话建立 / 重签时回调，页面据此展示当前 assetId */
  onSession?: (session: { assetId: number; key: string }) => void
}

/** 放弃既有会话：DELETE 服务端上传档案，成功后清除本地 IndexedDB 记录 */
export async function abortUpload(assetId: number, fingerprint?: string): Promise<void> {
  await apiJson(`/api/admin/upload/${assetId}`, { method: 'DELETE' })
  if (fingerprint) await idbDel(fingerprint)
}

/* ========== 单文件直传 ========== */

/**
 * 单文件直传（建议 ≤8MB）：presign → PUT 裸二进制。
 * PUT 返回 403 视为签名过期：重新 presign 换新地址重试一次（进度从头再报）。
 */
export async function uploadOne(
  file: File,
  onProgress?: (percent: number) => void,
  hooks: UploadHooks = {},
): Promise<UploadOneResult> {
  const report = (loaded: number) => onProgress?.(file.size ? Math.min(100, Math.round((loaded / file.size) * 100)) : 100)
  const signals = [hooks.cancelSignal, hooks.interruptSignal].filter((s): s is AbortSignal => !!s)

  const presign = () => apiJson<PresignData>('/api/admin/upload/presign', {
    method: 'POST',
    body: { scene: hooks.scene ?? 'moment', contentType: file.type },
  })

  let pre = await presign()
  hooks.onSession?.({ assetId: pre.assetId, key: pre.key })
  try {
    await putBlob(pre.uploadUrl, pre.contentType, file, { onLoaded: report, signals })
  } catch (err) {
    if (hooks.cancelSignal?.aborted) {
      await abortUpload(pre.assetId)
      throw new ApiError('已取消上传：服务端档案已清理', -2)
    }
    if (hooks.interruptSignal?.aborted) throw new ApiError('已中止上传', -3)
    if (err instanceof ApiError && err.code === 403) {
      // 签名过期：重新 presign 后整文件重试一次
      pre = await presign()
      hooks.onSession?.({ assetId: pre.assetId, key: pre.key })
      await putBlob(pre.uploadUrl, pre.contentType, file, { onLoaded: report, signals })
      return { assetId: pre.assetId, key: pre.key, accessUrl: pre.accessUrl, contentType: pre.contentType }
    }
    throw err
  }
  return { assetId: pre.assetId, key: pre.key, accessUrl: pre.accessUrl, contentType: pre.contentType }
}

/* ========== 大文件分片 + 断点续传 ========== */

/** 进行中的分片会话（init 或 resume 的归一结果） */
interface ActiveSession {
  assetId: number
  key: string
  partSize: number
  partCount: number
  contentType: string
  partUrls: string[]
  uploadedParts: number[]
}

/**
 * 分片上传：init（或按本地记录 resume 对账）→ 按 partSize 切片并发 3 逐片 PUT →
 * complete。命中本地记录时先 resume：跳过服务端已传分片，只补缺失分片；
 * resume 返回 404 = 会话失效，清记录后回退全新 init。
 *
 * - interruptSignal：模拟中断，停发剩余分片但保留会话与本地记录，供续传测试；
 * - cancelSignal：取消上传，DELETE 服务端档案并清本地记录，下次走全新 init。
 */
export async function uploadMultipart(
  file: File,
  onProgress?: (percent: number) => void,
  onResume?: (info: ResumeInfo) => void,
  hooks: UploadHooks = {},
): Promise<UploadMultipartResult> {
  const fingerprint = fingerprintOf(file)

  async function initSession(): Promise<ActiveSession> {
    const r = await apiJson<MultipartInitData>('/api/admin/upload/multipart/init', {
      method: 'POST',
      body: { scene: hooks.scene ?? 'moment', contentType: file.type, sizeBytes: file.size },
    })
    await idbPut({
      fingerprint,
      assetId: r.assetId,
      key: r.key,
      uploadId: r.uploadId,
      partSize: r.partSize,
      partCount: r.partCount,
      contentType: r.contentType,
      fileName: file.name,
      fileSize: file.size,
      createdAt: Date.now(),
    })
    return { assetId: r.assetId, key: r.key, partSize: r.partSize, partCount: r.partCount, contentType: r.contentType, partUrls: [...r.partUrls], uploadedParts: [] }
  }

  /* 1) 会话：命中本地记录先 resume 对账，404 视为会话失效回退全新 init */
  let resumed = false
  async function establishSession(): Promise<ActiveSession> {
    const saved = await getUploadRecord(fingerprint)
    if (saved?.assetId) {
      try {
        const r = await apiJson<MultipartResumeData>('/api/admin/upload/multipart/resume', {
          method: 'POST',
          body: { assetId: saved.assetId },
        })
        resumed = true
        return {
          assetId: r.assetId ?? saved.assetId,
          key: r.key ?? saved.key,
          partSize: r.partSize ?? saved.partSize,
          partCount: r.partCount ?? saved.partCount,
          contentType: r.contentType ?? saved.contentType,
          partUrls: [...r.partUrls],
          uploadedParts: r.uploadedParts,
        }
      } catch (err) {
        // 其余错误照常上抛，不清记录（可能只是网络抖动，会话仍可续）
        if (!(err instanceof ApiError && err.code === 404)) throw err
        await idbDel(fingerprint)
      }
    }
    return initSession()
  }

  const session = await establishSession()
  onResume?.({ assetId: session.assetId, uploadedParts: session.uploadedParts, resumed, partSize: session.partSize, partCount: session.partCount })
  hooks.onSession?.({ assetId: session.assetId, key: session.key })

  /* 2) 按 partSize 切片，并发 3 只补缺失分片 */
  const { partSize, partCount, contentType, assetId } = session
  const partUrls = session.partUrls
  const uploaded = new Set(session.uploadedParts)
  // 末片可能不满 partSize
  const partBytes = (n: number) => (n === partCount ? file.size - (partCount - 1) * partSize : partSize)
  let settledBytes = 0
  for (const n of uploaded) settledBytes += partBytes(n)

  const partLoaded = new Array<number>(partCount).fill(0)
  const report = () => {
    let bytes = settledBytes
    for (let n = 1; n <= partCount; n++) if (!uploaded.has(n)) bytes += partLoaded[n - 1] ?? 0
    onProgress?.(file.size ? Math.min(100, Math.round((bytes / file.size) * 100)) : 100)
  }
  report()

  // 内部联动信号：外部 cancel / interrupt 任一触发即停发新分片、中止在途 XHR
  const internal = new AbortController()
  const forward = () => internal.abort()
  hooks.cancelSignal?.addEventListener('abort', forward)
  hooks.interruptSignal?.addEventListener('abort', forward)
  // 外部信号可能早已触发（如会话建立期间点了取消），补一次状态检查
  if (hooks.cancelSignal?.aborted || hooks.interruptSignal?.aborted) internal.abort()

  // 403 = 签名过期：单飞 resume 换全套新地址，失败分片原地重试
  let refreshing: Promise<void> | null = null
  const refreshUrls = async () => {
    refreshing ??= (async () => {
      const r = await apiJson<MultipartResumeData>('/api/admin/upload/multipart/resume', {
        method: 'POST',
        body: { assetId },
      })
      partUrls.splice(0, partUrls.length, ...r.partUrls)
    })().finally(() => { refreshing = null })
    await refreshing
  }

  const missing: number[] = []
  for (let n = 1; n <= partCount; n++) if (!uploaded.has(n)) missing.push(n)

  const putPart = (n: number, blob: Blob) => putBlob(partUrls[n - 1]!, contentType, blob, {
    // 契约保证 partUrls 与分片一一对应（resume 亦返回全部重签地址）
    signals: [internal.signal],
    onLoaded: loaded => { partLoaded[n - 1] = loaded; report() },
  })

  let firstError: unknown = null
  let cursor = 0
  const worker = async (): Promise<void> => {
    while (!firstError && !internal.signal.aborted) {
      const idx = cursor++
      if (idx >= missing.length) return
      const n = missing[idx]!
      const start = (n - 1) * partSize
      const blob = file.slice(start, Math.min(start + partSize, file.size))
      try {
        await putPart(n, blob)
      } catch (err) {
        if (internal.signal.aborted) return // 停止原因由下方统一判定
        if (err instanceof ApiError && err.code === 403) {
          try {
            await refreshUrls()
            await putPart(n, blob)
          } catch (retryErr) {
            if (!internal.signal.aborted) { firstError ??= retryErr; internal.abort() }
            return
          }
        } else {
          firstError ??= err
          internal.abort()
          return
        }
      }
      partLoaded[n - 1] = partBytes(n)
      uploaded.add(n)
      settledBytes += partBytes(n)
      report()
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, missing.length) }, worker))
  hooks.cancelSignal?.removeEventListener('abort', forward)
  hooks.interruptSignal?.removeEventListener('abort', forward)

  if (hooks.cancelSignal?.aborted) {
    await abortUpload(assetId, fingerprint)
    throw new ApiError('已取消上传：服务端档案与本地记录已清理', -2)
  }
  if (hooks.interruptSignal?.aborted) {
    throw new ApiError(`已模拟中断：剩余分片停发，会话已保留（assetId=${assetId}，本地记录未清，重选同一文件可续传）`, -3)
  }
  if (firstError) throw firstError

  /* 3) complete（后端 listParts 核对，前端不回传 ETag） */
  const done = await apiJson<MultipartCompleteData>('/api/admin/upload/multipart/complete', {
    method: 'POST',
    body: { assetId },
  })
  await idbDel(fingerprint)
  return { assetId: done.assetId ?? assetId, key: done.key ?? session.key, accessUrl: done.accessUrl, sizeBytes: done.sizeBytes ?? file.size }
}

/* ========== 能力工厂：组件用它把「支持什么格式/多大/什么场景」绑定成一个上传器 ========== */

/** 绑定了能力的上传器：预检、accept、上传全部按能力约束，请求机制仍收在本模块 */
export interface Uploader {
  capability: UploadCapability
  /** 文件选择器的 accept 属性 */
  accept: string
  /** 按能力预检，返回 null 表示通过 */
  precheck: (file: File) => string | null
  /** 文件属于能力中的哪一类；不在能力内返回 null */
  kindOf: (file: File) => MediaKind | null
  uploadOne: (file: File, onProgress?: (percent: number) => void, hooks?: UploadHooks) => Promise<UploadOneResult>
  uploadMultipart: (file: File, onProgress?: (percent: number) => void, onResume?: (info: ResumeInfo) => void, hooks?: UploadHooks) => Promise<UploadMultipartResult>
}

/**
 * 每个上传组件（业务位）用自己声明的能力实例化一个上传器：
 * 能力声明什么格式、多大、哪个 scene，组件就获得什么样的上传行为；
 * 多个组件可自由组合同类规则（见 MOMENT_KINDS / IMAGE_RULE 等）。
 */
export function createUploader(capability: UploadCapability): Uploader {
  return {
    capability,
    accept: acceptOf(capability),
    precheck: file => precheckFile(file, capability),
    kindOf: file => fileKindOf(file, capability),
    uploadOne: (file, onProgress, hooks = {}) => uploadOne(file, onProgress, { ...hooks, scene: capability.scene }),
    uploadMultipart: (file, onProgress, onResume, hooks = {}) => uploadMultipart(file, onProgress, onResume, { ...hooks, scene: capability.scene }),
  }
}
