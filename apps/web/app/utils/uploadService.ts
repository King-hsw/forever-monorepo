/**
 * 动态媒体直传服务（presigned PUT → RustFS）
 *
 * 流程：客户端预检 → POST /api/admin/upload/presign 申请限时签名地址 →
 * PUT 原始二进制（仅 Content-Type 一个自定义头，不带任何凭证）→
 * 发布动态时回传 tmp key，由后端收口为正式地址。
 *
 * 硬性约束（均与签名相关，违反即 403）：
 * - PUT 不得用 FormData/multipart，body 就是文件原始二进制；
 * - Content-Type 必须与 presign 返回值逐字符一致（参与签名）；
 * - 不得携带 Authorization 头与 cookie（签名地址自带鉴权）。
 */
import { apiFetch, ApiError } from '~/utils/api'
import { uploadFile } from '~/utils/upload'

const MB = 1024 * 1024

/** 单类媒体的客户端预检规则 */
export interface UploadRule {
  types: readonly string[]
  max: number
  maxCount: number
}

export type UploadKind = 'image' | 'audio' | 'video'

/** 客户端预检白名单：申请 presign 前先在本地拦截，超限不发请求 */
export const UPLOAD_RULES: Record<UploadKind, UploadRule> = {
  image: { types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], max: 5 * MB, maxCount: 9 },
  audio: { types: ['audio/mpeg', 'audio/mp4', 'audio/wav'], max: 20 * MB, maxCount: 1 },
  video: { types: ['video/mp4', 'video/webm'], max: 100 * MB, maxCount: 1 },
}

/** POST /api/admin/upload/presign 的 data */
interface PresignResult {
  /** 限时直传 PUT 地址（默认 900 秒） */
  url: string
  /** 直传对象 key（tmp/ 前缀），发布动态时回传 */
  key: string
  /** PUT 时必须原样携带的 Content-Type（参与签名） */
  contentType: string
  expiresIn: number
}

/** presignAndUpload 的结果：key 回传给发布接口的 images / audio / video 字段 */
export interface UploadedMedia {
  key: string
  contentType: string
}

export interface PresignUploadOptions {
  /** 上传进度（0-100）；签名过期重试时从头再报 */
  onProgress?: (percent: number) => void
}

/* ---------- 并发闸：多文件同时直传，上限 3 ---------- */
const MAX_CONCURRENCY = 3
let activeCount = 0
const waiters: (() => void)[] = []

async function acquireSlot(): Promise<void> {
  if (activeCount < MAX_CONCURRENCY) {
    activeCount++
    return
  }
  await new Promise<void>(resolve => waiters.push(resolve))
  activeCount++
}

function releaseSlot(): void {
  activeCount--
  waiters.shift()?.()
}

/** 申请直传地址：只在发起上传前调用，不囤积 */
function presign(contentType: string): Promise<PresignResult> {
  return apiFetch<PresignResult>('/api/admin/upload/presign', {
    method: 'POST',
    body: { contentType },
  })
}

/** XHR PUT 文件原始二进制（fetch 拿不到上传进度）；成功即 resolve，非 2xx 抛 ApiError */
function putToStorage(
  url: string,
  contentType: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    // 参与签名，值必须与 presign 返回的 contentType 逐字符一致（不得加 charset 等后缀）
    xhr.setRequestHeader('Content-Type', contentType)
    // 签名地址自带鉴权：不携带 cookie / Authorization（withCredentials 默认即 false，显式声明防回归）
    xhr.withCredentials = false
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new ApiError(`文件直传失败（HTTP ${xhr.status}）`, xhr.status))
      }
    }
    // onerror 拿不到状态码，一般是 CORS / 网络问题（RustFS 跨域配置由后端处理）
    xhr.onerror = () => reject(new ApiError('文件直传网络错误，请检查网络后重试'))
    xhr.onabort = () => reject(new ApiError('文件直传已取消'))
    xhr.send(file)
  })
}

/**
 * 直传一个文件，返回发布接口需要的 { key, contentType }。
 * - 每个文件各申请一次签名地址（本函数即单文件语义，多文件并行调用即可，内部限并发 3）；
 * - PUT 返回 403（多为签名过期）时重新 presign 换新地址重试一次；
 * - presign 报「不支持直传」（local 存储模式）时回退旧 multipart 流程，
 *   此时 key 为正式地址（/uploads/moment/...），发布接口同样接受。
 */
export async function presignAndUpload(
  file: File,
  options: PresignUploadOptions = {},
): Promise<UploadedMedia> {
  await acquireSlot()
  try {
    let presigned: PresignResult
    try {
      presigned = await presign(file.type)
    } catch (err) {
      if (err instanceof ApiError && err.message.includes('不支持直传')) {
        // 回退旧 multipart 流程：返回正式地址（/uploads/moment/...），发布接口同样接受
        const url = await uploadFile(file)
        return { key: url, contentType: file.type }
      }
      throw err
    }

    try {
      await putToStorage(presigned.url, presigned.contentType, file, options.onProgress)
    } catch (err) {
      if (err instanceof ApiError && err.code === 403) {
        const fresh = await presign(file.type)
        await putToStorage(fresh.url, fresh.contentType, file, options.onProgress)
        return { key: fresh.key, contentType: fresh.contentType }
      }
      throw err
    }
    return { key: presigned.key, contentType: presigned.contentType }
  } finally {
    releaseSlot()
  }
}
