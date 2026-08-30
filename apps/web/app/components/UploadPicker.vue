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
 * - accept 从能力（kinds）派生，选中即预检，超限 / 类型不符零请求并 rejected 提示；
 * - 隐藏原生 input，触发按钮完全由使用方的 slot 决定（class 落在根 label 上自由定制）；
 * - 凭证路径按大小自动路由：≤8MB 单文件 presign，>8MB 分片 init（分界 SINGLE_FILE_MAX）；
 * - 逐个文件顺序上传，进度 / 结果 / 失败按文件 id 事件化抛出，列表 UI 由页面自持；
 * - ref 暴露 cancel()（中止整批）与 upload(file, opts)（页面级重试：不发 picked 等
 *   事件，进度走回调、结果走 Promise，页面直接复用自己的条目状态）。
 */
import {
  acceptOf,
  fileKindOf,
  precheckFile,
  SINGLE_FILE_MAX,
  uploadMultipart,
  uploadOne,
  type UploadKindRule,
  type UploadResult,
} from '~/utils/directUpload'

const props = withDefaults(defineProps<{
  /** 可上传类别（能力声明，由使用方定义）：每条规则含自定义类别标识 kind（事件
   *  原样带回）、MIME / 扩展名白名单与默认大小上限，accept 与预检从这里派生；
   *  预置媒体规则见 ~/utils/mediaKinds，也可按业务自定义任意类别 */
  kinds: UploadKindRule[]
  /** 本次上传的最大字节数：覆盖 kinds 里各类别的默认上限（预检按它拦截）。
   *  只建议收紧——超过后端白名单上限时，分片路径仍会被后端 init 校验拦下 */
  maxSize?: number
  /** 允许多选（多选时逐个顺序上传） */
  multiple?: boolean
  /** 本次最多接收的文件数，超出整批拦截提示；默认不限 */
  maxCount?: number
  disabled?: boolean
  /** 显式覆盖请求令牌（或取令牌的函数）：供独立会话场景使用；
   *  缺省走共享 apiFetch 的主站登录会话（401 自动静默续期） */
  token?: () => string
}>(), {
  multiple: false,
  maxCount: Number.POSITIVE_INFINITY,
  disabled: false,
})

const emit = defineEmits<{
  /** 预检全部通过、即将开始上传（每个文件有稳定 id，后续事件按 id 关联；
   *  kind 为 kinds 规则里声明的类别标识） */
  picked: [files: { id: number, file: File, kind: string }[]]
  progress: [p: { id: number, percent: number }]
  uploaded: [u: { id: number, file: File, kind: string, result: UploadResult }]
  failed: [f: { id: number, file: File, message: string, aborted: boolean }]
  /** 本地拦截（类型不符 / 超限 / 超量），未发任何请求，message 可直接展示 */
  rejected: [message: string]
}>()

const accept = computed(() => acceptOf(props.kinds))
/** 预检用的生效能力：maxSize 存在时覆盖各类别的默认上限（格式白名单不变） */
const effectiveKinds = computed(() => props.maxSize
  ? props.kinds.map(r => ({ ...r, maxBytes: props.maxSize! }))
  : props.kinds)
const inputEl = ref<HTMLInputElement | null>(null)
const busy = ref(false)
let seq = 0
let batch: AbortController | null = null

function onChange() {
  const files = Array.from(inputEl.value?.files ?? [])
  // 立即清空 input.value，保证重新选择同一文件时 change 仍会触发
  if (inputEl.value) inputEl.value.value = ''
  if (!files.length) return

  if (files.length > props.maxCount) {
    emit('rejected', `最多只能选择 ${props.maxCount} 个文件，已拦截，未发起任何请求`)
    return
  }

  const picked: { id: number, file: File, kind: string }[] = []
  for (const file of files) {
    // 预检一并覆盖类型与大小（不在白名单也在这里拦截）；maxSize 优先于类别默认上限
    const problem = precheckFile(file, effectiveKinds.value)
    if (problem) {
      emit('rejected', `${file.name}：${problem}`)
      continue
    }
    picked.push({ id: ++seq, file, kind: fileKindOf(file, props.kinds)! })
  }
  if (!picked.length) return

  emit('picked', picked)
  void runBatch(picked)
}

/** 一批文件顺序上传：批内共享一个中止信号，任一文件失败不影响后续文件 */
async function runBatch(picked: { id: number, file: File, kind: string }[]) {
  busy.value = true
  batch = new AbortController()
  try {
    for (const item of picked) {
      try {
        const result = await uploadById(item.id, item.file, batch.signal, (percent) => {
          emit('progress', { id: item.id, percent })
        })
        emit('uploaded', { id: item.id, file: item.file, kind: item.kind, result })
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
  return routeOf(file)(file, onProgress, { signal, token: props.token })
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
