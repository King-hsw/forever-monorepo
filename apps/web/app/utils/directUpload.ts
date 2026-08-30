/**
 * 内容寻址直传模块：先查秒传、再发凭证（MD5 寻址 + RustFS 公开桶直链）
 *
 * 对象 key 按「内容 MD5」寻址（{md5}.{ext}），同内容 = 同 key = 同直链。
 * 测试页（与后续业务组件）只调本模块的四个入口，md5 计算与 check 编排都在内部：
 * - computeMd5(file)：spark-md5 分块增量计算（逐块读，大文件不一次性进内存），
 *   结果按 File 实例缓存（含进行中的 Promise），同文件多处调用只算一次；
 * - checkExists(file)：先算 md5 再 POST /api/admin/upload/check，命中即拿 accessUrl；
 * - uploadOne(file, onProgress)：单文件直传编排（≤8MB），403 自动重签重试；
 * - uploadMultipart(file, onProgress)：大文件分片编排（>8MB），并发 3 逐片 PUT + complete。
 *
 * 上传编排（checkOrUpload 内统一收口）：
 * ① computeMd5 → ② POST check：exists=true 直接返回 accessUrl（秒传，零上传，流程结束）；
 *   exists=false → ③ 按路径申请凭证并直传。秒传判断只发生在 check 这一步，
 *   凭证签发与上传过程不再查询。
 * PUT 返回 403 = 签名过期：md5 不变，重新 check → 重新申请凭证，整轮重试一次
 * （重试轮先 check，若期间同内容已由别人 complete 过则直接秒传）。
 * 上传中断没有续传：不落任何本地会话，重传即重新走 check → 凭证全量重来
 * （md5 相同，若此前 complete 过会直接秒传）。
 *
 * 硬性约束（与签名相关，违反即 403）：
 * - PUT 一律裸二进制 + 仅 Content-Type 一个自定义头，不带 Authorization / cookie；
 * - Content-Type 与凭证返回值逐字符一致，不得追加 charset 等后缀；
 * - 分片大小与分片数完全以后端 init 返回为准，前端不自定；
 * - 不读不回传 ETag，complete 由后端 listParts 向 RustFS 核对。
 */
import SparkMD5 from 'spark-md5'
import { ApiError } from '~/utils/api'
import type { ApiResponse } from '#shared/types'

const MB = 1024 * 1024

/** 单文件直传与分片的凭证路径分界：≤8MB 走 presign 单文件，>8MB 走分片 init */
export const SINGLE_FILE_MAX = 8 * MB

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

/* ========== 客户端预检白名单：超限直接提示，不发任何请求 ========== */

export type MediaKind = 'image' | 'audio' | 'video'

/** 一类媒体的白名单规则：允许的 MIME / 扩展名与大小上限 */
export interface MediaKindRule {
  kind: MediaKind
  /** 展示用名称：图片 / 音频 / 视频 */
  label: string
  mimes: string[]
  /** 扩展名兜底（浏览器对 m4a 等的 MIME 不稳定），生成 accept 时转 .ext */
  exts: string[]
  maxBytes: number
}

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

/** 由白名单生成文件选择器的 accept 属性（MIME + .扩展名） */
export function acceptOf(kinds: MediaKindRule[]): string {
  const parts: string[] = []
  for (const rule of kinds) parts.push(...rule.mimes, ...rule.exts.map(ext => `.${ext}`))
  return parts.join(',')
}

function ruleOf(file: File, kinds: MediaKindRule[]): MediaKindRule | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return kinds.find(r => r.mimes.includes(file.type) || r.exts.includes(ext)) ?? null
}

/** 文件属于哪一类；不在白名单内返回 null */
export function fileKindOf(file: File, kinds: MediaKindRule[]): MediaKind | null {
  return ruleOf(file, kinds)?.kind ?? null
}

/** 客户端预检：通过返回 null；否则返回可直接展示的拦截原因（此时不应发任何请求） */
export function precheckFile(file: File, kinds: MediaKindRule[]): string | null {
  if (!file.size) return '空文件无法上传'
  const rule = ruleOf(file, kinds)
  if (!rule) {
    const supported = kinds.map(r => `${r.label} ${r.exts.join('/')}`).join('、')
    return `不支持的文件类型（仅支持：${supported}），已拦截，未发起任何请求`
  }
  if (file.size > rule.maxBytes) {
    return `${rule.label}超过 ${fmtBytes(rule.maxBytes)} 限制（当前 ${fmtBytes(file.size)}），已拦截，未发起任何请求`
  }
  return null
}

/* ========== MD5：spark-md5 分块增量计算，按 File 实例缓存 ========== */

const MD5_CHUNK = 2 * MB

/** 缓存存 Promise：并发调用（页面预热 + 上传内部）共享同一次计算 */
const md5Cache = new WeakMap<File, Promise<string>>()

/**
 * 计算文件内容 MD5（32 位十六进制小写）。
 * 按 MD5_CHUNK 逐块 slice → arrayBuffer → append，任意时刻只有一块在内存；
 * 结果按 File 实例缓存，同文件重复调用（含并发）不重算。
 */
export function computeMd5(file: File): Promise<string> {
  const cached = md5Cache.get(file)
  if (cached) return cached
  const task = (async () => {
    const spark = new SparkMD5.ArrayBuffer()
    for (let start = 0; start < file.size; start += MD5_CHUNK) {
      const buf = await file.slice(start, Math.min(start + MD5_CHUNK, file.size)).arrayBuffer()
      spark.append(buf)
    }
    return spark.end()
  })()
  md5Cache.set(file, task)
  // 失败不缓存：下次调用重算（读盘错误可能是暂时的）
  task.catch(() => md5Cache.delete(file))
  return task
}

/* ========== 接口契约（对应 forever-server 内容寻址直传接口） ========== */

/** POST /api/admin/upload/check 的 data */
interface CheckData {
  exists: boolean
  accessUrl: string
  contentType: string
}

/** POST /api/admin/upload/presign 的 data */
interface PresignData {
  key: string
  uploadUrl: string
  accessUrl: string
  contentType: string
  expiresIn: number
}

/** POST /api/admin/upload/multipart/init 的 data */
interface MultipartInitData {
  key: string
  uploadId: string
  partSize: number
  partCount: number
  partUrls: string[]
  accessUrl: string
  contentType: string
  expiresIn: number
}

/** POST /api/admin/upload/multipart/complete 的 data */
interface MultipartCompleteData {
  key: string
  accessUrl: string
  sizeBytes: number
}

/** 上传结果：业务字段只填 accessUrl；instant=true 表示 check 命中秒传（零上传） */
export interface UploadResult {
  accessUrl: string
  contentType: string
  instant: boolean
}

/** 单独查询秒传（一般无需直接调：uploadOne / uploadMultipart 已内置 check 编排） */
export async function checkExists(file: File, hooks: UploadHooks = {}): Promise<CheckData> {
  const md5 = await computeMd5(file)
  return apiJson<CheckData>('/api/admin/upload/check', {
    method: 'POST',
    body: { contentType: file.type, md5 },
    token: tokenOf(hooks),
  })
}

/* ========== XHR PUT：裸二进制 + 单 Content-Type 头 ========== */

interface PutOptions {
  /** 已上传字节数（fetch 拿不到上传进度，统一走 XHR） */
  onLoaded?: (loaded: number) => void
  /** 任一信号中止即 xhr.abort() */
  signals?: AbortSignal[]
}

/**
 * PUT 文件整体 / 单个分片到对象存储（RustFS 预签地址）。
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
    // 参与签名：值必须与凭证返回的 contentType 逐字符一致，不得追加 charset 等后缀
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

/* ========== 上传编排：check 秒传 → 凭证直传；403 重签整轮重试一次 ========== */

export interface UploadHooks {
  /** 触发即中止在途请求、停发剩余分片（新契约无续传，重传需全量重来） */
  signal?: AbortSignal
  /** 显式令牌（或取令牌的函数）：业务页面传主站会话令牌；缺省读测试页独立令牌。
   *  显式传入后完全以此为准（含空值），不再回退测试页令牌 */
  token?: string | (() => string)
}

/** 解析本次请求应携带的令牌：显式 token 优先（函数即时求值），否则测试页独立会话 */
function tokenOf(hooks?: UploadHooks): string {
  const t = hooks?.token
  if (t !== undefined) return typeof t === 'function' ? t() : t
  return getUploadToken()
}

const MAX_ATTEMPTS = 2

/**
 * 统一编排：① computeMd5 → ② check（exists=true 即秒传返回，流程结束）→
 * ③ run() 申请凭证并直传。PUT 403 = 签名过期：md5 不变，重新 check → 重新申请凭证，
 * 整轮重试一次（MAX_ATTEMPTS；重试轮先 check，期间同内容若已 complete 过会直接秒传）。
 */
async function checkOrUpload(file: File, run: () => Promise<UploadResult>, hooks: UploadHooks = {}): Promise<UploadResult> {
  const md5 = await computeMd5(file)
  const check = () => apiJson<CheckData>('/api/admin/upload/check', {
    method: 'POST',
    body: { contentType: file.type, md5 },
    token: tokenOf(hooks),
  })
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const found = await check()
    if (hooks.signal?.aborted) throw new DOMException('上传已中止', 'AbortError')
    if (found.exists) return { accessUrl: found.accessUrl, contentType: found.contentType, instant: true }
    try {
      return await run()
    } catch (err) {
      // 403 = 签名过期：回到轮首重新 check → 换新凭证；取消 / 其余错误不重试
      if (err instanceof ApiError && err.code === 403 && !hooks.signal?.aborted && attempt < MAX_ATTEMPTS) continue
      throw err
    }
  }
  // MAX_ATTEMPTS=2 时循环内必然 return 或 throw，此处仅为类型收窄
  throw new ApiError('上传重试次数已用尽', -1)
}

/* ========== 单文件直传（≤8MB）：presign → PUT ========== */

/**
 * 单文件直传编排：check 秒传 → presign → PUT 文件原始二进制（进度 0-100）。
 * 秒传命中时不发起任何上传请求，直接返回既有直链。
 */
export async function uploadOne(
  file: File,
  onProgress?: (percent: number) => void,
  hooks: UploadHooks = {},
): Promise<UploadResult> {
  const report = (loaded: number) => onProgress?.(file.size ? Math.min(100, Math.round((loaded / file.size) * 100)) : 100)
  const signals = hooks.signal ? [hooks.signal] : []

  return checkOrUpload(file, async () => {
    const pre = await apiJson<PresignData>('/api/admin/upload/presign', {
      method: 'POST',
      body: { contentType: file.type, md5: await computeMd5(file) },
      token: tokenOf(hooks),
    })
    await putBlob(pre.uploadUrl, pre.contentType, file, { onLoaded: report, signals })
    return { accessUrl: pre.accessUrl, contentType: pre.contentType, instant: false }
  }, hooks)
}

/* ========== 大文件分片（>8MB）：init → 并发逐片 PUT → complete ========== */

/** 分片并发数：一片传完即领下一片（规格并发 2-3，取 3） */
const PART_CONCURRENCY = 3

/**
 * 大文件分片编排：check 秒传 → init 拿 partUrls → 按返回的 partSize 切片、
 * 并发 PART_CONCURRENCY 逐片 PUT（xhr.upload.onprogress 按分片累加）→ complete。
 * 后端 complete 时自行 listParts 核对，前端不读不回传 ETag；
 * 任一分片失败即停发剩余分片，403 由编排层整轮重签重试，其余错误原样上抛
 * （无续传：重传即重新 check → init 全量重来）。
 */
export async function uploadMultipart(
  file: File,
  onProgress?: (percent: number) => void,
  hooks: UploadHooks = {},
): Promise<UploadResult> {
  return checkOrUpload(file, async () => {
    const init = await apiJson<MultipartInitData>('/api/admin/upload/multipart/init', {
      method: 'POST',
      body: { contentType: file.type, md5: await computeMd5(file), sizeBytes: file.size },
      token: tokenOf(hooks),
    })
    const { partSize, partCount, contentType } = init
    // 后端 init 自带去重兜底：check 未命中但对象在 init 时已存在（竞态），
    // 返回 partCount=0 且无 uploadId —— 直接按秒传返回，不发分片、不 complete
    if (init.partCount === 0 || !init.uploadId) {
      return { accessUrl: init.accessUrl, contentType, instant: true }
    }
    const partUrls = [...init.partUrls]

    // 末片可能不满 partSize
    const partBytes = (n: number) => (n === partCount ? file.size - (partCount - 1) * partSize : partSize)
    // 进度 = 已完成分片字节 + 在途分片 xhr 累加字节
    const partLoaded = new Array<number>(partCount).fill(0)
    const settled: boolean[] = new Array(partCount).fill(false)
    const report = () => {
      let bytes = 0
      for (let i = 0; i < partCount; i++) bytes += settled[i] ? partBytes(i + 1) : (partLoaded[i] ?? 0)
      onProgress?.(file.size ? Math.min(100, Math.round((bytes / file.size) * 100)) : 100)
    }
    report()

    // 内部联动信号：任一分片失败 / 外部取消即停发新分片、中止在途 XHR
    const internal = new AbortController()
    if (hooks.signal) {
      if (hooks.signal.aborted) internal.abort()
      else hooks.signal.addEventListener('abort', () => internal.abort(), { once: true })
    }

    let firstError: unknown = null
    let cursor = 0
    const worker = async (): Promise<void> => {
      while (!firstError && !internal.signal.aborted) {
        const idx = cursor++
        if (idx >= partCount) return
        const n = idx + 1
        const start = (n - 1) * partSize
        const blob = file.slice(start, Math.min(start + partSize, file.size))
        try {
          // 契约保证 partUrls 与分片一一对应：partUrls[i] 对应第 i+1 片
          await putBlob(partUrls[idx]!, contentType, blob, {
            signals: [internal.signal],
            onLoaded: loaded => { partLoaded[idx] = loaded; report() },
          })
        } catch (err) {
          if (internal.signal.aborted && !hooks.signal?.aborted) return // 停止原因由 firstError 分支统一收口
          firstError ??= err
          internal.abort()
          return
        }
        settled[idx] = true
        report()
      }
    }
    await Promise.all(Array.from({ length: Math.min(PART_CONCURRENCY, partCount) }, worker))
    if (hooks.signal?.aborted) throw new DOMException('上传已中止', 'AbortError')
    if (firstError) throw firstError

    // complete：后端 listParts 向 RustFS 核对，前端只报 key + uploadId
    const done = await apiJson<MultipartCompleteData>('/api/admin/upload/multipart/complete', {
      method: 'POST',
      body: { key: init.key, uploadId: init.uploadId },
      token: tokenOf(hooks),
    })
    return { accessUrl: done.accessUrl, contentType, instant: false }
  }, hooks)
}
