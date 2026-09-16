/**
 * 文件上传：内容寻址直传（md5 秒传）+ 分片断点续传
 *
 * 流程：
 *   1. 计算文件 md5
 *   2. check 查秒传 —— 服务端已有同内容对象则直接复用 accessUrl，零流量
 *   3. 小文件（≤ 8MB）走 presign 拿单次直传凭证，PUT 到对象存储
 *   4. 大文件走 multipart/init 拿分片凭证，逐片 PUT 后再 complete 合并
 *
 * 关键约束：
 *   - PUT 到 storage 时必须携带与申请时一致的 Content-Type，否则签名校验失败
 *   - 分片大小固定 8MB，非末片必须恰好 8MB
 *   - Content-Type 必须在后端白名单内，否则 400（40001）
 *   - 直传不走 request 实例：目标是对象存储的绝对地址，不能带 baseURL 与 Bearer 令牌
 */
import axios from 'axios';
import SparkMD5 from 'spark-md5';

import { request } from '@/utils/request';

import type {
  MultipartCompleteRequest,
  MultipartCompleteResponse,
  MultipartInitRequest,
  MultipartInitResponse,
  UploadCheckRequest,
  UploadCheckResponse,
  UploadPresignRequest,
  UploadPresignResponse,
} from './model/types';
import { UPLOAD_MIME_WHITELIST } from './model/types';

/** 分片阈值与分片大小，与后端一致 */
const MULTIPART_THRESHOLD = 8 * 1024 * 1024;
/** 计算 md5 时的读取块大小 */
const MD5_CHUNK_SIZE = 2 * 1024 * 1024;

const Api = {
  Check: '/api/admin/upload/check',
  Presign: '/api/admin/upload/presign',
  MultipartInit: '/api/admin/upload/multipart/init',
  MultipartComplete: '/api/admin/upload/multipart/complete',
} as const;

export interface UploadResult {
  key: string;
  accessUrl: string;
  sizeBytes: number;
}

export interface UploadOptions {
  /** 上传进度百分比 0–100 */
  onProgress?: (percent: number) => void;
}

/** 校验 MIME 是否在白名单内 */
export function isAllowedMime(contentType: string): boolean {
  return Object.hasOwn(UPLOAD_MIME_WHITELIST, contentType);
}

/** 判断该 MIME 属于哪一类资源，便于调用方限制选择器 accept */
export function mimeCategory(contentType: string): 'image' | 'audio' | 'video' | null {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType.startsWith('video/')) return 'video';
  return null;
}

/**
 * 分块计算文件 md5（32 位小写 hex）。
 * 一次性读入大文件会吃掉大量内存，故按块累加。
 */
export function computeMd5(file: Blob, onProgress?: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const total = Math.max(1, Math.ceil(file.size / MD5_CHUNK_SIZE));
    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();
    let index = 0;

    const readNext = () => {
      const start = index * MD5_CHUNK_SIZE;
      reader.readAsArrayBuffer(file.slice(start, Math.min(start + MD5_CHUNK_SIZE, file.size)));
    };

    reader.onload = (event) => {
      spark.append(event.target?.result as ArrayBuffer);
      index += 1;
      onProgress?.(Math.round((index / total) * 100));
      if (index < total) readNext();
      else resolve(spark.end());
    };

    reader.onerror = () => reject(new Error('读取文件失败，无法计算校验值'));
    readNext();
  });
}

/* ---------------- 后端凭证接口 ---------------- */

/** 秒传检查 */
export function checkUpload(data: UploadCheckRequest) {
  return request.post<UploadCheckResponse>({ url: Api.Check, data });
}

/** 申请单次直传凭证 */
export function presignUpload(data: UploadPresignRequest) {
  return request.post<UploadPresignResponse>({ url: Api.Presign, data });
}

/** 初始化分片上传 */
export function initMultipart(data: MultipartInitRequest) {
  return request.post<MultipartInitResponse>({ url: Api.MultipartInit, data });
}

/** 合并分片 */
export function completeMultipart(data: MultipartCompleteRequest) {
  return request.post<MultipartCompleteResponse>({ url: Api.MultipartComplete, data });
}

/* ---------------- 直传对象存储 ---------------- */

/**
 * 直接 PUT 到对象存储。
 * 使用裸 axios：目标为绝对地址，且预签名 URL 自带鉴权，不能附加 Authorization 头
 * （附加反而会让签名不匹配）。
 */
async function putToStorage(
  url: string,
  body: Blob,
  contentType: string,
  onUploadProgress?: (event: { loaded: number; total?: number }) => void,
): Promise<void> {
  await axios.put(url, body, {
    headers: { 'Content-Type': contentType },
    withCredentials: false,
    timeout: 0,
    onUploadProgress,
  });
}

/* ---------------- 对外入口 ---------------- */

/**
 * 完整上传流程。返回可直接写入业务字段（如封面、动态图片）的 accessUrl。
 *
 * @throws 文件类型不在白名单时抛出业务错误；网络或存储失败时抛出 axios 错误
 */
export async function uploadFile(file: File, options: UploadOptions = {}): Promise<UploadResult> {
  const { onProgress } = options;
  const contentType = file.type;

  if (!isAllowedMime(contentType)) {
    throw new Error(`不支持的文件类型：${contentType || '未知'}，请上传常见图片 / 音频 / 视频格式`);
  }
  if (file.size === 0) {
    throw new Error('文件内容为空');
  }

  // md5 占进度前 10%，剩余 90% 留给实际传输，避免大文件长时间停在 0%
  const md5 = await computeMd5(file, (percent) => onProgress?.(Math.round(percent * 0.1)));

  const transfer =
    (fraction: (uploaded: number, total: number) => number) => (event: { loaded: number; total?: number }) => {
      const total = event.total || file.size;
      onProgress?.(10 + Math.round(fraction(event.loaded, total) * 90));
    };

  // 1) 秒传：服务端已有同内容对象
  const check = await checkUpload({ contentType, md5 });
  if (check.exists) {
    onProgress?.(100);
    return { key: '', accessUrl: check.accessUrl, sizeBytes: file.size };
  }

  // 2) 小文件：单次直传
  if (file.size <= MULTIPART_THRESHOLD) {
    const presign = await presignUpload({ contentType, md5 });
    await putToStorage(
      presign.uploadUrl,
      file,
      contentType,
      transfer((loaded, total) => loaded / total),
    );
    onProgress?.(100);
    return { key: presign.key, accessUrl: presign.accessUrl, sizeBytes: file.size };
  }

  // 3) 大文件：分片上传。逐片串行，单片成功才发下一片，失败可直接重试该片
  const init = await initMultipart({ contentType, md5, sizeBytes: file.size });
  const { partCount, partSize, partUrls } = init;

  for (let i = 0; i < partCount; i += 1) {
    const start = i * partSize;
    const end = Math.min(start + partSize, file.size);
    const blob = file.slice(start, end);
    await putToStorage(
      partUrls[i],
      blob,
      contentType,
      transfer((loaded) => (i + loaded / (end - start)) / partCount),
    );
  }

  const completed = await completeMultipart({ key: init.key, uploadId: init.uploadId });
  onProgress?.(100);
  return {
    key: completed.key,
    accessUrl: completed.accessUrl,
    sizeBytes: completed.sizeBytes,
  };
}
