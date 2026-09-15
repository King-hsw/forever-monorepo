<template>
  <label class="upload-picker" :class="{ 'is-disabled': disabled || busy }">
    <slot>选择文件</slot>
    <input
      ref="inputEl"
      class="upload-picker__input"
      type="file"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled || busy"
      @change="onChange"
    >
  </label>
</template>

<script setup lang="ts">
/**
 * 通用上传组件：能力声明 + 预检 + 直传编排的 UI 收口。
 *
 * 底层走 directUpload 模块（先查秒传、再发凭证），组件只补 UI 层的最后一公里：
 * - accept 从 exts 派生，选中即预检，超限 / 类型不符零请求并 rejected 提示；
 * - 隐藏原生 input，触发按钮完全由使用方的 slot 决定（class 落在根 label 上自由定制）；
 * - 凭证路径按大小自动路由：≤8MB 单文件 presign，>8MB 分片 init（分界 SINGLE_FILE_MAX）；
 * - 逐个文件顺序上传，进度 / 结果 / 失败按文件 id 事件化抛出，列表 UI 由页面自持；
 * - ref 暴露 cancel()（中止整批）与 upload(file, opts)（页面级重试：不发 picked 等
 *   事件，进度走回调、结果走 Promise，页面直接复用自己的条目状态）。
 */
import {
  extOf,
  precheckFile,
  SINGLE_FILE_MAX,
  uploadMultipart,
  uploadOne,
  type UploadResult,
} from '~/utils/directUpload'
import { compressImageFile } from '~/utils/imageUpload'

const props = withDefaults(defineProps<{
  /** 允许上传的后缀白名单（不含点，如 ['jpg', 'png']）：文件选择器的 accept
   *  与本地预检都从这里派生；不在白名单内的文件零请求直接拦截 */
  exts: string[]
  /** 单文件最大字节数（预检按它拦截）；缺省不限，超限由后端白名单兜底 */
  maxSize?: number
  /** 允许多选（多选时逐个顺序上传） */
  multiple?: boolean
  /** 本次最多接收的文件数，超出整批拦截提示；默认不限 */
  maxCount?: number
  disabled?: boolean
}>(), {
  multiple: false,
  maxCount: Number.POSITIVE_INFINITY,
  disabled: false,
})

const emit = defineEmits<{
  /** 预检全部通过、即将开始上传（每个文件有稳定 id，后续事件按 id 关联；
   *  ext 为文件的小写扩展名，页面靠它区分类型） */
  picked: [files: { id: number, file: File, ext: string }[]]
  progress: [p: { id: number, percent: number }]
  uploaded: [u: { id: number, file: File, ext: string, result: UploadResult }]
  failed: [f: { id: number, file: File, message: string, aborted: boolean }]
  /** 本地拦截（类型不符 / 超限 / 超量），未发任何请求，message 可直接展示 */
  rejected: [message: string]
}>()

const accept = computed(() => props.exts.map(ext => `.${ext}`).join(','))
const inputEl = ref<HTMLInputElement | null>(null)
const busy = ref(false)
let seq = 0
let batch: AbortController | null = null

async function onChange() {
  const files = Array.from(inputEl.value?.files ?? [])
  // 立即清空 input.value，保证重新选择同一文件时 change 仍会触发
  if (inputEl.value) inputEl.value.value = ''
  if (!files.length) return

  if (files.length > props.maxCount) {
    emit('rejected', `最多只能选择 ${props.maxCount} 个文件，已拦截，未发起任何请求`)
    return
  }

  const picked: { id: number, file: File, ext: string }[] = []
  for (const file of files) {
    // 图片先压缩（缩放 + WebP）再预检：手机原图 10MB+ 压到几百 KB，大小限制基本不再触发
    const target = file.type.startsWith('image/') ? await compressImageFile(file) : file
    const problem = precheckFile(target, props.exts, props.maxSize)
    if (problem) {
      emit('rejected', `${file.name}：${problem}`)
      continue
    }
    picked.push({ id: ++seq, file: target, ext: extOf(target) })
  }
  if (!picked.length) return

  emit('picked', picked)
  void runBatch(picked)
}

/** 一批文件顺序上传：批内共享一个中止信号，任一文件失败不影响后续文件 */
async function runBatch(picked: { id: number, file: File, ext: string }[]) {
  busy.value = true
  batch = new AbortController()
  try {
    for (const item of picked) {
      try {
        const result = await uploadById(item.id, item.file, batch.signal, (percent) => {
          emit('progress', { id: item.id, percent })
        })
        emit('uploaded', { id: item.id, file: item.file, ext: item.ext, result })
      } catch (err) {
        emit('failed', {
          id: item.id,
          file: item.file,
          message: err instanceof Error ? err.message : '上传失败',
          aborted: err instanceof DOMException && err.name === 'AbortError',
        })
      }
    }
  } finally {
    busy.value = false
    batch = null
  }
}

function routeOf(file: File) {
  // 凭证路径按大小路由：超过单文件分界走分片，其余走单文件直传
  return file.size > SINGLE_FILE_MAX ? uploadMultipart : uploadOne
}

function uploadById(id: number, file: File, signal?: AbortSignal, onProgress?: (percent: number) => void) {
  return routeOf(file)(file, onProgress, { signal })
}

/** 页面级重试：复用上传管线但不再发 picked / progress / uploaded / failed 事件，
 *  进度与结果走回调与 Promise，页面直接更新自己的条目状态 */
function upload(file: File, opts: { onProgress?: (percent: number) => void } = {}) {
  return uploadById(-1, file, undefined, opts.onProgress)
}

/** 中止当前批次：在途请求中止、剩余文件停传（各文件以 aborted 失败事件收尾） */
function cancel() {
  batch?.abort()
}

defineExpose({ cancel, upload })
</script>

<style scoped>
.upload-picker {
  cursor: pointer;
}

.upload-picker.is-disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

/* 视觉隐藏但保持可激活：display:none 会让 Safari 的 label 联动失效 */
.upload-picker__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
