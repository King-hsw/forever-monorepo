/**
 * 编辑器图片上传：上传前压缩 + 对象存储直传。
 *
 * 与前台 Nuxt 版的关键差异：那边是「压缩后转 data URL 内嵌进文档」的纯前端方案，
 * 正文会随图片数量线性膨胀；后台这里改为真正上传到对象存储，正文里只存 accessUrl。
 * 复用 @/api/upload 已有的内容寻址直传能力（md5 秒传 + 8MB 分片断点续传）。
 *
 * 压缩放在上传之前：既省流量，也让图片统一收敛到白名单内的 MIME
 * （canvas 重编码产物为 image/webp / image/png / image/jpeg，均在白名单内）。
 */

import { uploadFile } from '@/api/upload';

/** 允许的图片类型 */
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** 压缩：最长边上限 */
const COMPRESS_MAX_DIM = 1600;

/** 压缩：小于该字节数的文件原样返回（小图重编码只亏不赚） */
const COMPRESS_MIN_BYTES = 200 * 1024;

/** 排除的扩展名（SVG 等不在白名单内的图片格式） */
const EXCLUDED_EXT = /\.(?:svg|bmp|tiff?|avif)$/i;

export function isSupportedImage(file: File): boolean {
  return ACCEPTED_TYPES.has(file.type) && !EXCLUDED_EXT.test(file.name);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('图片解码失败')));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('图片编码失败'))), type, quality),
  );
}

/**
 * 上传前图片压缩：等比缩到 COMPRESS_MAX_DIM 内并转 WebP，返回新 File。
 * 供直传使用（内容寻址对压缩后内容照常生效）。
 * GIF 原样返回（canvas 重绘丢动画）；小于 COMPRESS_MIN_BYTES 原样返回。
 * Firefox 不支持 WebP 编码（toBlob 静默降级为 PNG）：按实际 blob.type 判断，
 * 透明图（PNG 输入）兜底 PNG，其余兜底 JPEG。
 */
export async function compressImageFile(file: File): Promise<File> {
  if (file.type === 'image/gif' || file.size <= COMPRESS_MIN_BYTES) return file;

  const url = URL.createObjectURL(file);
  let canvas: HTMLCanvasElement;
  try {
    const image = await loadImage(url);
    const scale = Math.min(1, COMPRESS_MAX_DIM / Math.max(image.width, image.height));
    canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }

  let blob = await canvasToBlob(canvas, 'image/webp', 0.8);
  if (blob.type !== 'image/webp') {
    blob = await canvasToBlob(canvas, file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.8);
  }
  const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
  return new File([blob], `${file.name.replace(/\.[^.]*$/, '')}.${ext}`, { type: blob.type });
}

/**
 * 图片上传入口：压缩后直传对象存储，返回可直接写进 <img src> 的地址。
 *
 * options.onProgress 回调上传进度百分比 0–100（压缩阶段不计数）。
 * 文件类型不支持或上传失败时抛出异常，由调用方提示用户。
 */
export async function uploadImageFile(
  file: File,
  options: { onProgress?: (percent: number) => void } = {},
): Promise<string> {
  if (!isSupportedImage(file)) {
    throw new Error(`不支持的图片格式：${file.type || '未知'}`);
  }
  const compressed = await compressImageFile(file);
  const result = await uploadFile(compressed, { onProgress: options.onProgress });
  return result.accessUrl;
}
