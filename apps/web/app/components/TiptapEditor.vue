<template>
  <div class="tiptap-editor" :class="{ 'tiptap-editor--fluid': fluid }">
    <!-- 工具栏 -->
    <div v-if="editor" class="tiptap-editor__toolbar">
      <div class="tiptap-editor__group">
        <button type="button" title="撤销 (⌘Z)" :disabled="!editor.can().undo()" @click="editor.chain().focus().undo().run()">
          ↩
        </button>
        <button type="button" title="重做 (⌘⇧Z)" :disabled="!editor.can().redo()" @click="editor.chain().focus().redo().run()">
          ↪
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
    </div>

    <!-- 编辑区域；header 插槽用于在正文上方放标题等自定义内容（文章编辑页的大标题输入） -->
    <div class="tiptap-editor__body">
      <slot name="header" />
      <EditorContent :editor="editor" class="tiptap-editor__content" />
    </div>

    <!-- 隐藏的图片选择输入框 -->
    <input ref="imageInputRef" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden @change="onImagePicked">

    <!-- 链接输入弹窗 -->
    <dialog v-if="showLinkDialog" open class="tiptap-editor__dialog" @close="showLinkDialog = false">
      <form @submit.prevent="confirmLink">
        <h3>插入链接</h3>
        <input v-model="linkUrl" type="text" placeholder="https://example.com" autofocus />
        <div class="tiptap-editor__dialog-actions">
          <button type="button" @click="showLinkDialog = false">取消</button>
          <button type="submit" class="primary" :disabled="!linkUrl">确定</button>
        </div>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Image from '@tiptap/extension-image'
import { Marked } from 'marked'
import { createLowlight } from 'lowlight'
import type { LanguageFn } from 'highlight.js'
import { codeLanguages } from '../utils/codeLanguages'
import 'highlight.js/styles/github.css'
import { CodeBlockLineNumbers } from '../extensions/CodeBlockLineNumbers'
import { fileToImageSrc, isSupportedImage } from '../utils/imageUpload'

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
    StarterKit.configure({ codeBlock: false }),
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
    Markdown.configure({ marked: new Marked() }),
  ],
  // Nuxt 使用 SSR，禁止在服务器端渲染，仅在客户端 hydration 后渲染
  immediatelyRender: false,
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
    emit('update:markdown', editor.getMarkdown())
  },
  // 拦截粘贴 / 拖拽的图片文件，走本地上传逻辑而不是默认行为
  editorProps: {
    handlePaste: (_view, event) => {
      const files = event.clipboardData?.files
      if (!files?.length || !Array.from(files).some(isSupportedImage)) {
        return false
      }
      void insertImageFiles(files)
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

// 链接弹窗
const showLinkDialog = ref(false)
const linkUrl = ref('')

function toggleLink() {
  if (!editor.value) {
    return
  }
  if (editor.value.isActive('link')) {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  linkUrl.value = editor.value.getAttributes('link').href || ''
  showLinkDialog.value = true
}

function confirmLink() {
  const href = linkUrl.value.trim()
  if (!href) {
    return
  }
  editor.value
    ?.chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href })
    .run()
  showLinkDialog.value = false
}
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
    color: var(--c-text-muted);
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
    color: var(--c-text-muted);
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
