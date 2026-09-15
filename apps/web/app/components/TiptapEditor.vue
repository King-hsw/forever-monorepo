<template>
  <div class="tiptap-editor" :class="{ 'tiptap-editor--fluid': fluid }">
    <!-- 工具栏 -->
    <div v-if="editor" class="tiptap-editor__toolbar">
      <div class="tiptap-editor__group">
        <button type="button" title="撤销 (⌘Z)" :disabled="!editor.can().undo()" @click="editor.chain().focus().undo().run()">
          <Icon name="lucide:undo-2" />
        </button>
        <button type="button" title="重做 (⌘⇧Z)" :disabled="!editor.can().redo()" @click="editor.chain().focus().redo().run()">
          <Icon name="lucide:redo-2" />
        </button>
      </div>

      <div class="tiptap-editor__group">
        <button type="button" title="正文" :class="{ 'is-active': editor.isActive('paragraph') }" @click="editor.chain().focus().setNode('paragraph').run()">
          正文
        </button>
        <button type="button" title="标题 1" :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }" @click="editor.chain().focus().toggleHeading({ level: 1 }).run()">
          H1
        </button>
        <button type="button" title="标题 2" :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">
          H2
        </button>
        <button type="button" title="标题 3" :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">
          H3
        </button>
      </div>

      <div class="tiptap-editor__group">
        <button type="button" title="加粗 (⌘B)" :class="{ 'is-active': editor.isActive('bold') }" @click="editor.chain().focus().toggleBold().run()">
          <strong>B</strong>
        </button>
        <button type="button" title="斜体 (⌘I)" :class="{ 'is-active': editor.isActive('italic') }" @click="editor.chain().focus().toggleItalic().run()">
          <em>I</em>
        </button>
        <button type="button" title="下划线 (⌘U)" :class="{ 'is-active': editor.isActive('underline') }" @click="editor.chain().focus().toggleUnderline().run()">
          <u>U</u>
        </button>
        <button type="button" title="删除线" :class="{ 'is-active': editor.isActive('strike') }" @click="editor.chain().focus().toggleStrike().run()">
          <s>S</s>
        </button>
      </div>

      <div class="tiptap-editor__group">
        <button type="button" title="行内代码" :class="{ 'is-active': editor.isActive('code') }" @click="editor.chain().focus().toggleCode().run()">
          &lt;/&gt;
        </button>
        <button type="button" title="代码块" :class="{ 'is-active': editor.isActive('codeBlock') }" @click="editor.chain().focus().toggleCodeBlock().run()">
          代码块
        </button>
        <button type="button" title="引用" :class="{ 'is-active': editor.isActive('blockquote') }" @click="editor.chain().focus().toggleBlockquote().run()">
          引用
        </button>
      </div>

      <div class="tiptap-editor__group">
        <button type="button" title="无序列表" :class="{ 'is-active': editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()">
          • 列表
        </button>
        <button type="button" title="有序列表" :class="{ 'is-active': editor.isActive('orderedList') }" @click="editor.chain().focus().toggleOrderedList().run()">
          1. 列表
        </button>
        <button type="button" title="分割线" @click="editor.chain().focus().setHorizontalRule().run()">
          ―
        </button>
      </div>

      <div class="tiptap-editor__group">
        <button type="button" title="插入/移除链接" :class="{ 'is-active': editor.isActive('link') }" @click="toggleLink">
          链接
        </button>
        <button type="button" title="插入图片" :disabled="uploading" @click="pickImage">
          {{ uploading ? '上传中…' : '图片' }}
        </button>
      </div>

      <div class="tiptap-editor__group">
        <div ref="tablePickerRef" class="tiptap-editor__picker">
          <!-- pointerdown.stop：避免冒泡到 document 的关闭监听，否则点击会在「关闭 → 再打开」之间来回 -->
          <button
            type="button"
            title="插入表格"
            :class="{ 'is-active': editor.isActive('table') || showTablePicker }"
            @pointerdown.stop
            @click="showTablePicker = !showTablePicker"
          >
            表格
          </button>

          <div v-if="showTablePicker" class="tiptap-editor__table-picker">
            <div class="tiptap-editor__table-picker-grid" @mouseleave="hoverRow = 0; hoverCol = 0">
              <template v-for="r in TABLE_PICKER_MAX" :key="r">
                <button
                  v-for="c in TABLE_PICKER_MAX"
                  :key="`${r}-${c}`"
                  type="button"
                  class="tiptap-editor__table-picker-cell"
                  :class="{ 'is-on': r <= hoverRow && c <= hoverCol }"
                  @mouseenter="hoverRow = r; hoverCol = c"
                  @click="insertTable(r, c)"
                />
              </template>
            </div>
            <p class="tiptap-editor__table-picker-label">
              {{ hoverRow && hoverCol ? `${hoverRow} 行 × ${hoverCol} 列` : '拖选行列数' }}
            </p>
            <p class="tiptap-editor__table-picker-hint">
              首行作为表头（Markdown 表格语法的要求）
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑区域；header 插槽用于在正文上方放标题等自定义内容（文章编辑页的大标题输入） -->
    <div class="tiptap-editor__body">
      <slot name="header" />
      <EditorContent :editor="editor" class="tiptap-editor__content" />
    </div>

    <!-- 隐藏的图片选择输入框 -->
    <input ref="imageInputRef" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden @change="onImagePicked">

    <!-- 链接输入弹窗 -->
    <dialog v-if="showLinkDialog" open class="tiptap-editor__dialog" @close="closeLinkDialog">
      <form @submit.prevent="confirmLink">
        <h3>插入链接</h3>
        <input v-model="linkUrl" type="text" placeholder="https://example.com" autofocus @input="linkError = ''">
        <p v-if="linkError" class="tiptap-editor__dialog-error">
          {{ linkError }}
        </p>
        <div class="tiptap-editor__dialog-actions">
          <button type="button" @click="closeLinkDialog">
            取消
          </button>
          <button type="submit" class="primary" :disabled="!linkUrl">
            确定
          </button>
        </div>
      </form>
    </dialog>

    <!-- Markdown 粘贴确认弹窗：检测到 Markdown 语法时询问是否转换 -->
    <dialog v-if="showPasteDialog" open class="tiptap-editor__dialog" @close="showPasteDialog = false">
      <h3>检测到 Markdown 语法</h3>
      <p>粘贴内容包含 Markdown 语法，要转换成格式化内容吗？</p>
      <div class="tiptap-editor__dialog-actions">
        <button type="button" @click="confirmPaste(false)">保持原样</button>
        <button type="button" class="primary" @click="confirmPaste(true)">转换</button>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Code from '@tiptap/extension-code'
import { Markdown } from '@tiptap/markdown'
import Image from '@tiptap/extension-image'
import { TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { Marked, marked } from 'marked'
import { createLowlight } from 'lowlight'
import type { LanguageFn } from 'highlight.js'
import { codeLanguages } from '../utils/codeLanguages'
import 'highlight.js/styles/github.css'
import { CodeBlockLineNumbers } from '../extensions/CodeBlockLineNumbers'
import { TableMarkdownSafe } from '../extensions/TableMarkdownSafe'
import { fileToImageSrc, isSupportedImage } from '../utils/imageUpload'
import { containsTable, normalizePastedTableHtml } from '../utils/pasteTable'

const props = withDefaults(
  defineProps<{
    /** 编辑器内容：初始化时为 Markdown，编辑后回传 HTML（支持 v-model） */
    modelValue?: string
    /** 编辑器内容对应的 Markdown（支持 v-model:markdown）；初始化时优先生效 */
    markdown?: string
    /** 撑满父容器高度（用于分栏布局） */
    fluid?: boolean
  }>(),
  {
    modelValue: '',
    markdown: '',
    fluid: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:markdown': [value: string]
}>()

// 与 MarkdownView 共用同一份语言清单，保证两边高亮能力一致
const lowlight = createLowlight()
lowlight.register(codeLanguages as Record<string, LanguageFn>)

const editor = useEditor({
  // 初始内容优先取 Markdown（后端存储格式），并声明 contentType: 'markdown'，
  // 这样 Markdown 扩展会在初始化时先解析为文档；否则字符串会按 HTML 处理，
  // 导致 Markdown 源码原样显示、不渲染
  content: props.markdown || props.modelValue,
  contentType: 'markdown',
  // 给 Markdown 扩展单独的 marked 实例，避免它把自定义 tokenizer（如 underline 的 ++text++）
  // 注册到全局 marked 上，污染页面里其他用 marked 做渲染的地方
  // StarterKit 自带的 CodeBlock 没有语法高亮，禁用它；换用继承自
  // CodeBlockLowlight 的 CodeBlockLineNumbers，同时提供高亮和外挂式行号栏
  extensions: [
    // 禁用 StarterKit 自带 code mark：其 excludes:'_'（排斥一切 mark）会让
    // @tiptap/markdown 解析出的 `**`code`**`（bold+code 同节点）被判非法，
    // insertContent/insertContentAt 时 node.check() 抛错静默失败（setContent
    // 由 markdown 扩展先 parse 成 JSON，不走该校验）。换成不排斥任何
    // mark 的等价 code mark，粗体代码等嵌套行内样式可正常表示（与 marked 渲染一致）
    StarterKit.configure({ codeBlock: false, code: false }),
    Code.extend({ excludes: '' }),
    // 图片：本项目无后端，上传后以 data URL 内嵌，必须开启 allowBase64 才能解析回显；
    // 补充 referrerpolicy=no-referrer，避免防盗链站点拒给图片（Markdown 序列化会丢，
    // 展示端 MarkdownView 会再补）
    Image.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          referrerpolicy: { default: 'no-referrer' },
        }
      },
    }).configure({ allowBase64: true }),
    // 代码块内启用 Tab 缩进：Tab 插入缩进、Shift-Tab 反向缩进（支持多行选区）
    CodeBlockLineNumbers.configure({ lowlight, enableTabIndentation: true, tabSize: 2 }),
    // 表格：resizable 开启列宽拖拽（靠 colgroup + table-layout: fixed 生效），
    // allowTableNodeSelection 保持默认关闭——点选整表会与单元格文本选择冲突，
    // 删除整表由表格操作菜单提供。此处用 TableMarkdownSafe 而非官方 Table，
    // 它修掉了官方序列化遗漏转义竖线导致的数据损坏（见该扩展内的说明）。
    TableMarkdownSafe.configure({ resizable: true, lastColumnResizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    // @tiptap/markdown 的类型声明要求 marked 单例（含 getDefaults），
    // 实际只需要 Marked 实例能力，这里收窄为声明类型
    Markdown.configure({ marked: new Marked() as unknown as typeof marked }),
  ],
  // Nuxt 使用 SSR，禁止在服务器端渲染，仅在客户端 hydration 后渲染
  // @ts-expect-error tiptap vue-3 类型未收录 immediatelyRender，运行时仍支持
  immediatelyRender: false,
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
    emit('update:markdown', editor.getMarkdown())
  },
  // 拦截粘贴 / 拖拽的图片文件（走本地上传），以及含 Markdown 语法的纯文本（弹窗确认是否转换）
  editorProps: {
    handlePaste: (_view, event) => {
      const files = event.clipboardData?.files
      if (files?.length && Array.from(files).some(isSupportedImage)) {
        void insertImageFiles(files)
        return true
      }
      const ed = editor.value
      if (!ed) {
        return false
      }
      // 代码块/行内代码内粘贴保持纯文本，避免代码被解析成富节点
      if (ed.isActive('codeBlock') || ed.isActive('code')) {
        return false
      }
      const cd = event.clipboardData
      const html = cd?.getData('text/html')
      // 含表格的富文本先清洗再插入：平铺合并单元格、首行提升为表头、去掉来源噪音，
      // 让编辑态结构与保存后的 GFM 结构完全一致（详见 utils/pasteTable.ts）
      if (containsTable(html)) {
        // 单元格内再粘一张表会形成嵌套表格，而 GFM 语法表达不了嵌套，
        // 序列化必然损坏——退化为纯文本插入，由用户自行取舍内容
        if (ed.isActive('table')) {
          const text = cd?.getData('text/plain')?.trim()
          if (text) {
            event.preventDefault()
            // 传 JSON 而非字符串：字符串会被 Tiptap 按 HTML 解析，纯文本里的
            // 尖括号会被当成标签吃掉
            ed.chain().focus().insertContent([{ type: 'text', text }]).run()
            return true
          }
          return false
        }
        const cleaned = normalizePastedTableHtml(html as string)
        if (cleaned) {
          event.preventDefault()
          // 传 HTML 字符串，交给 ProseMirror 按 schema 解析成表格节点
          ed.chain().focus().insertContent(cleaned).run()
          return true
        }
      }
      // 其余富文本（HTML）粘贴走默认行为
      if (html) {
        return false
      }
      const text = cd?.getData('text/plain')?.trim()
      if (!text || !MARKDOWN_RE.test(text)) {
        return false
      }
      // 检测到 Markdown 语法：拦截并弹窗，由用户决定是否转换
      event.preventDefault()
      pendingPasteText.value = text
      showPasteDialog.value = true
      return true
    },
    handleDrop: (view, event) => {
      const files = event.dataTransfer?.files
      if (!files?.length || !Array.from(files).some(isSupportedImage)) {
        return false
      }
      event.preventDefault()
      // 计算落点位置，图片插入到鼠标松开的地方；多张时逐个往后排
      const dropPos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
      void insertImageFiles(files, dropPos)
      return true
    },
  },
})

/** 上传状态（工具栏按钮据此禁用并显示提示） */
const uploading = ref(false)
const imageInputRef = ref<HTMLInputElement | null>(null)

function pickImage() {
  imageInputRef.value?.click()
}

function onImagePicked(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) {
    void insertImageFiles(input.files)
  }
  // 允许下次选择同一文件仍触发 change
  input.value = ''
}

/** 压缩并逐张插入图片；pos 为空时插入到当前光标处 */
async function insertImageFiles(files: FileList | File[], pos?: number) {
  const ed = editor.value
  if (!ed || uploading.value) {
    return
  }
  const images = Array.from(files).filter(isSupportedImage)
  if (!images.length) {
    return
  }

  uploading.value = true
  try {
    let insertPos = pos
    for (const file of images) {
      const src = await fileToImageSrc(file)
      const chain = ed.chain().focus()
      if (insertPos === undefined) {
        chain.setImage({ src })
      }
      else {
        // 图片节点在文档中占 1 个位置，连续插入依次后移保持顺序
        chain.insertContentAt(insertPos, { type: 'image', attrs: { src } })
        insertPos += 1
      }
      chain.run()
    }
  }
  finally {
    uploading.value = false
  }
}

// 外部更新（v-model）时同步到编辑器
watch(
  () => props.modelValue,
  (value) => {
    const ed = editor.value
    if (!ed) {
      return
    }
    // 编辑器自身回传的是 HTML、父组件可能直接喂回 Markdown，两者都视为相同内容跳过
    const isSame = ed.getHTML() === value || ed.getMarkdown() === value
    if (isSame) {
      return
    }
    // 外部传入的正文是 Markdown，需声明 contentType 让扩展先解析再写入
    ed.commands.setContent(value, { contentType: 'markdown', emitUpdate: false })
    emit('update:markdown', ed.getMarkdown())
  },
)

// 初始内容同步 Markdown（editor 在 useEditor 的 onMounted 中创建，本钩子在其后执行）
onMounted(() => {
  const ed = editor.value
  if (ed) {
    emit('update:markdown', ed.getMarkdown())
  }
})

// Markdown 粘贴确认弹窗
const showPasteDialog = ref(false)
const pendingPasteText = ref('')

// 检测常见 Markdown 块级/行内语法；命中即弹窗询问（误报只会多弹一次窗，由用户拍板）
const MARKDOWN_RE = /(^#{1,6}\s|^```|^>|\*\*[^*\n]+\*\*|`[^`\n]+`|^\s*[-*+]\s+|^\s*\d+[.)]\s|!\[[^\]]*\]\(|\[[^\]]+\]\([^)]*\)|^(-{3,}|\*{3,}|_{3,})\s*$|\+\+[^+\n]+\+\+)/m

function confirmPaste(convert: boolean) {
  const text = pendingPasteText.value
  showPasteDialog.value = false
  pendingPasteText.value = ''
  const ed = editor.value
  if (!ed || !text) {
    return
  }
  if (convert) {
    // 复用 @tiptap/markdown 的解析管线（同一 marked 实例，自定义 tokenizer / 代码块行号均生效）
    ed.chain().focus().insertContent(text, { contentType: 'markdown' }).run()
  }
  else {
    ed.chain().focus().insertContent(text).run()
  }
}

// 链接弹窗
const showLinkDialog = ref(false)
const linkUrl = ref('')
const linkError = ref('')

function toggleLink() {
  const ed = editor.value
  if (!ed) {
    return
  }
  if (ed.isActive('link')) {
    ed.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  linkError.value = ''
  // 光标落在已有链接上时回填地址，方便改完直接确认
  linkUrl.value = (ed.getAttributes('link').href as string | undefined) ?? ''
  showLinkDialog.value = true
}

function closeLinkDialog() {
  showLinkDialog.value = false
  linkUrl.value = ''
  linkError.value = ''
}

/** 补全协议：用户常直接输 example.com，不补会存成站内相对链接（点到 /example.com 去了） */
function normalizeLinkHref(raw: string): string {
  const href = raw.trim()
  if (!href) {
    return ''
  }
  // 站内绝对路径、锚点、协议相对地址（//host）、相对路径和已带协议的都保持原样
  if (/^(?:[a-z][\da-z+.-]*:|\/\/|\/|#|\.)/i.test(href)) {
    return href
  }
  return `https://${href}`
}

function confirmLink() {
  const ed = editor.value
  if (!ed) {
    return
  }
  const href = normalizeLinkHref(linkUrl.value)
  if (!href) {
    linkError.value = '请输入链接地址'
    return
  }
  // setLink 命令本身不做选区扩展：未选中文字时 setMark 只会写进 storedMarks，
  // 文档一个字符都不变，弹窗一关就丢——表现就是「点了确定什么都没发生」。
  // 所以空选区改为插入一段以地址为文本的链接，操作结果立刻可见。
  if (ed.state.selection.empty) {
    ed.chain()
      .focus()
      .insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] })
      // 链接 mark 是 inclusive 的，不解除的话紧跟着输入的文字会继续带链接
      .unsetMark('link')
      .run()
  }
  else {
    // setLink 对不在白名单里的协议（如 javascript:）返回 false 且不动文档
    if (!ed.chain().focus().setLink({ href }).run()) {
      linkError.value = '这个链接地址不被支持，请检查协议'
      return
    }
  }
  closeLinkDialog()
}

/* ---------------- 表格 ---------------- */

/** 插入表格时可选的最大行列数（网格选择器是 8×8） */
const TABLE_PICKER_MAX = 8

const showTablePicker = ref(false)
const hoverRow = ref(0)
const hoverCol = ref(0)
const tablePickerRef = ref<HTMLElement | null>(null)

function insertTable(rows: number, cols: number) {
  showTablePicker.value = false
  hoverRow.value = 0
  hoverCol.value = 0
  // withHeaderRow 必须为 true：GFM 表格语法强制要求表头行，缺了它序列化时会
  // 补出一行空表头，展示端就多一条空白表头栏。rows 是含表头在内的总行数。
  editor.value?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
}

/** 点击选择器以外的位置收起网格选择器 */
function onDocumentPointerDown(event: PointerEvent) {
  if (showTablePicker.value && !tablePickerRef.value?.contains(event.target as Node)) {
    showTablePicker.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})
</script>

<style>
/* 编辑器容器 */
.tiptap-editor {
  --tt-border: #d9d9e3;
  --tt-accent: #6366f1;

  border: 1px solid var(--tt-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--c-bg-card);
}

/* 撑满父容器（分栏布局） */
.tiptap-editor--fluid {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* fluid 时 body（header 插槽 + 正文）撑满剩余高度，正文区自身滚动 */
.tiptap-editor--fluid .tiptap-editor__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tiptap-editor--fluid .tiptap-editor__content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.tiptap-editor--fluid .tiptap {
  min-height: 100%;
}

/* 工具栏 */
.tiptap-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px;
  border-bottom: 1px solid var(--tt-border);
  background: var(--c-bg-soft);
}

.tiptap-editor__group {
  display: flex;
  gap: 2px;
  padding: 0 4px;

  & + & {
    border-left: 1px solid var(--tt-border);
  }
}

.tiptap-editor__group button {
  min-width: 28px;
  padding: 4px 8px;
  font-size: 13px;
  line-height: 1;
  color: var(--c-text);
  text-align: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #ececf4;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.is-active {
    background: var(--tt-accent);
    color: #fff;
  }
}

/* 插入表格：行列网格选择器（挂在工具栏按钮下方） */
.tiptap-editor__picker {
  position: relative;
}

.tiptap-editor__table-picker {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 40;
  padding: 10px;
  background: var(--c-bg-card);
  border: 1px solid var(--tt-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 14%);
}

.tiptap-editor__table-picker-grid {
  display: grid;
  grid-template-columns: repeat(8, 15px);
  gap: 2px;
}

.tiptap-editor__table-picker-cell {
  width: 15px;
  height: 15px;
  padding: 0;
  background: var(--c-bg-card);
  border: 1px solid var(--tt-border);
  border-radius: 2px;
  cursor: pointer;

  &.is-on {
    background: var(--tt-accent);
    border-color: var(--tt-accent);
  }
}

.tiptap-editor__table-picker-label {
  margin: 8px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-text);
  text-align: center;
}

.tiptap-editor__table-picker-hint {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--c-text-muted);
  text-align: center;
}

/* 编辑区域（.tiptap 是 Tiptap 的根元素）
 * 标题/段落/列表/引用/行内代码/pre/链接/图片/hr/表格等排版
 * 由全局共享样式 app/assets/css/prose.css 提供（与 MarkdownView 完全一致），
 * 这里只保留编辑器特有的规则：容器、::selection、选中描边、代码块 NodeView。 */
.tiptap-editor__content {
  .tiptap {
    min-height: 200px;
    padding: 16px 20px;
    outline: none;
  }

  /* 代码块（NodeView 渲染为 顶栏 + 行号栏 + pre 的组合，见 CodeBlockLineNumbers.ts）
   * 结构与配色完全对齐详情页的 .md-code-block：Mac 三圆点顶栏、
   * 字号 0.9em / 行高 1.5 / 底色 --c-bg-soft / 圆角 8px */
  .tiptap .tiptap-code-block {
    display: block;
    margin: 0.8em 0;
    font-size: 0.9em;
    line-height: 1.5;
    background: var(--c-bg-soft);
    border-radius: 8px;
  }

  /* 顶栏：三圆点 + 语言选择 + 复制按钮，同 .md-code-block__bar */
  .tiptap .tiptap-code-block__toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px 4px;
  }

  .tiptap .tiptap-code-block__dots {
    display: inline-flex;
    gap: 6px;
    margin-right: auto;
  }

  .tiptap .tiptap-code-block__dots i {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .tiptap .tiptap-code-block__dots i:nth-child(1) { background: #ff5f57; }
  .tiptap .tiptap-code-block__dots i:nth-child(2) { background: #febc2e; }
  .tiptap .tiptap-code-block__dots i:nth-child(3) { background: #28c840; }

  /* 语言选择 / 复制按钮：胶囊样式，同 .md-code-block__lang / __copy */
  .tiptap .tiptap-code-block__language-select {
    max-width: 130px;
    padding: 1px 8px;
    font-size: 11.5px;
    line-height: 1.5;
    /* 同详情页顶栏：用 secondary，muted 对代码块底对比度在两主题都不足 */
    color: var(--c-text-secondary);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 999px;
    cursor: pointer;

    &:hover,
    &:focus {
      border-color: color-mix(in srgb, var(--c-primary) 45%, transparent);
      outline: none;
    }
  }

  .tiptap .tiptap-code-block__copy-button {
    padding: 1px 8px;
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--c-text-secondary);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 999px;
    cursor: pointer;

    &:hover {
      color: var(--c-primary);
      border-color: color-mix(in srgb, var(--c-primary) 45%, transparent);
    }

    &.is-copied {
      color: var(--c-success);
      border-color: var(--c-success);
    }
  }

  /* 外挂行号栏：字号 / 行高随 .tiptap-code-block；颜色与宽度与详情页的
     pre code .line::before 对齐（--c-text-muted / 3ch / 1em 间距）；
     上下内边距与 pre 一致，保证行号和首行代码在同一水平线上 */
  .tiptap .tiptap-code-block__body {
    display: flex;
  }

  .tiptap .tiptap-code-block__gutter {
    flex-shrink: 0;
    padding: 4px 0 12px 14px;
    text-align: right;
    color: var(--c-text-muted);
    user-select: none;
    cursor: default;
  }

  .tiptap .tiptap-code-block__gutter span {
    display: block;
    min-width: 3ch;
    padding-right: 1em;
  }

  .tiptap .tiptap-code-block pre {
    flex: 1;
    min-width: 0;
    margin: 0;
    /* 同详情页 .md-code-block pre：顶栏已占一行，上下留白收紧 */
    padding: 4px 16px 12px 12px;
    overflow-x: auto;
    /* 字号 / 行高继承 .tiptap-code-block（0.9em / 1.5），与行号栏及详情页
       代码块完全一致；避免叠乘共享样式导致错位 */
    font-size: inherit;
    line-height: inherit;
  }

  /* 表格：编辑态必须有可见的单元格框线——展示态那套「无框线 + 斑马纹」在编辑时
   * 看不出格子边界，光标落在哪个单元格全靠猜。配色仍沿用 prose.css 的变量，
   * 保证与展示端同主题下的观感一致。
   *
   * table-layout: fixed 是列宽拖拽生效的前提：官方 NodeView 把每列宽度写进
   * colgroup，布局算法若为 auto，列宽会被内容撑开而忽略 colgroup。 */
  .tiptap .tableWrapper {
    margin: 0.8em 0;
    overflow-x: auto;
  }

  .tiptap table {
    width: 100%;
    table-layout: fixed;
  }

  .tiptap th,
  .tiptap td {
    position: relative;
    min-width: 1em;
    padding: 6px 10px;
    vertical-align: top;
    border: 1px solid color-mix(in srgb, var(--prose-rule-border) 75%, transparent);
  }

  /* 编辑态没有 thead（ProseMirror 把所有行都渲染进 tbody），表头靠 th 标签区分 */
  .tiptap th {
    font-weight: 600;
    background: var(--c-bg-soft);
  }

  /* 单元格内的段落收紧，避免每格都被默认段距撑高；多段之间留出小间距 */
  .tiptap th > p,
  .tiptap td > p {
    margin: 0;
  }

  .tiptap th > p + p,
  .tiptap td > p + p {
    margin-top: 0.4em;
  }

  /* 斑马纹：展示端的 tbody 不含表头行，编辑端 tbody 的首行就是表头（占第 1 位），
   * 因此这里要用 odd 才能与展示端着色在同一批数据行上。共用样式里的 even 规则
   * 会作用到编辑端的另一批行，必须显式清掉，否则每个数据行都会带上底色。 */
  .tiptap tbody tr:nth-child(even) {
    background: transparent;
  }

  .tiptap tbody tr:nth-child(odd):not(:first-child) {
    background: color-mix(in srgb, var(--c-bg-soft) 45%, transparent);
  }

  /* 跨格拖选时的单元格选区高亮 */
  .tiptap .selectedCell::after {
    position: absolute;
    inset: 0;
    z-index: 2;
    content: '';
    pointer-events: none;
    background: color-mix(in srgb, var(--tt-accent) 14%, transparent);
  }

  /* 列宽拖拽手柄与拖拽中的光标（由表格 NodeView 在拖拽时挂上） */
  .tiptap .column-resize-handle {
    position: absolute;
    top: 0;
    right: -2px;
    bottom: 0;
    z-index: 20;
    width: 4px;
    pointer-events: none;
    background: var(--tt-accent);
  }

  .tiptap.resize-cursor {
    cursor: col-resize;
  }

  /* 图片节点被选中时的描边 */
  .tiptap img.ProseMirror-selectednode {
    outline: 2px solid var(--tt-accent);
  }

  /* 选中高亮 */
  .tiptap ::selection {
    background: rgba(99, 102, 241, 0.25);
  }
}

/* 链接弹窗 */
.tiptap-editor__dialog {
  margin: 0;
  padding: 20px;
  border: none;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);

  &::backdrop {
    background: rgba(0, 0, 0, 0.3);
  }

  h3 {
    margin: 0 0 12px;
    font-size: 15px;
  }

  input {
    width: 100%;
    padding: 8px 10px;
    font-size: 14px;
    border: 1px solid #d9d9e3;
    border-radius: 6px;
    outline: none;

    &:focus {
      border-color: var(--tt-accent);
    }
  }
}

.tiptap-editor__dialog-error {
  margin: 8px 0 0;
  font-size: 12px;
  color: #d93025;
}

.tiptap-editor__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;

  button {
    padding: 6px 14px;
    font-size: 13px;
    border: 1px solid #d9d9e3;
    border-radius: 6px;
    background: var(--c-bg-card);
    cursor: pointer;

    &.primary {
      background: var(--tt-accent);
      border-color: var(--tt-accent);
      color: #fff;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
