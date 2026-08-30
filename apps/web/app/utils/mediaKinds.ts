/**
 * 预置媒体能力规则（业务侧声明）：图片 / 音频 / 视频。
 *
 * 内核 directUpload 不感知具体媒体类型——类别标识（kind）由使用方通过
 * kinds prop 自定义，这里只是本站媒体上传的预置白名单（MIME / 扩展名 /
 * 大小上限），供动态发布页与直传测试页复用；新业务可直接另声明自己的规则。
 */
import type { UploadKindRule } from '~/utils/directUpload'

const MB = 1024 * 1024

export const IMAGE_RULE: UploadKindRule = { kind: 'image', label: '图片', mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], exts: ['jpg', 'jpeg', 'png', 'webp', 'gif'], maxBytes: 5 * MB }
export const AUDIO_RULE: UploadKindRule = { kind: 'audio', label: '音频', mimes: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav'], exts: ['mp3', 'm4a', 'wav'], maxBytes: 20 * MB }
export const VIDEO_RULE: UploadKindRule = { kind: 'video', label: '视频', mimes: ['video/mp4', 'video/webm', 'video/mkv'], exts: ['mp4', 'webm', 'mkv'], maxBytes: 100 * MB }
export const MOMENT_KINDS: UploadKindRule[] = [IMAGE_RULE, AUDIO_RULE, VIDEO_RULE]
