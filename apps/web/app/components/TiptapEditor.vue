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
      </div>
    </div>

    <!-- 编辑区域 -->
    <EditorContent :editor="editor" class="tiptap-editor__content" />

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
import { Marked } from 'marked'
import { createLowlight } from 'lowlight'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import bash from 'highlight.js/lib/languages/bash'
import shell from 'highlight.js/lib/languages/shell'
import json from 'highlight.js/lib/languages/json'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import python from 'highlight.js/lib/languages/python'
import markdown from 'highlight.js/lib/languages/markdown'
import yaml from 'highlight.js/lib/languages/yaml'
import 'highlight.js/styles/github.css'
import { CodeBlockLineNumbers } from '../extensions/CodeBlockLineNumbers'

const props = withDefaults(
  defineProps<{
    /** 编辑器 HTML 内容（支持 v-model） */
    modelValue?: string
    /** 编辑器内容对应的 Markdown（支持 v-model:markdown） */
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

// 只注册常用语言（与 MarkdownView 保持一致），控制打包体积
const lowlight = createLowlight()
lowlight.register({
  javascript,
  typescript,
  js: javascript,
  ts: typescript,
  bash,
  sh: bash,
  shell,
  json,
  css,
  xml,
  html: xml,
  python,
  markdown,
  md: markdown,
  yaml,
  yml: yaml,
})

const editor = useEditor({
  content: props.modelValue,
  // 给 Markdown 扩展单独的 marked 实例，避免它把自定义 tokenizer（如 underline 的 ++text++）
  // 注册到全局 marked 上，污染页面里其他用 marked 做渲染的地方
  // StarterKit 自带的 CodeBlock 没有语法高亮，禁用它；换用继承自
  // CodeBlockLowlight 的 CodeBlockLineNumbers，同时提供高亮和外挂式行号栏
  extensions: [
    StarterKit.configure({ codeBlock: false }),
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
})

// 外部更新（v-model）时同步到编辑器
watch(
  () => props.modelValue,
  (value) => {
    const ed = editor.value
    if (!ed) {
      return
    }
    const isSame = ed.getHTML() === value
    if (isSame) {
      return
    }
    ed.commands.setContent(value, { emitUpdate: false })
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
  background: #fff;
}

/* 撑满父容器（分栏布局） */
.tiptap-editor--fluid {
  display: flex;
  flex-direction: column;
  height: 100%;
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
  background: #f8f8fb;
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
  color: #333;
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

/* 编辑区域（.tiptap 是 Tiptap 的根元素） */
.tiptap-editor__content {
  .tiptap {
    min-height: 200px;
    padding: 16px 20px;
    font-size: 15px;
    line-height: 1.7;
    color: #222;
    outline: none;
  }

  .tiptap p {
    margin: 0.6em 0;
  }

  .tiptap h1,
  .tiptap h2,
  .tiptap h3 {
    font-weight: 600;
    line-height: 1.3;
    margin: 1em 0 0.5em;
  }

  .tiptap h1 {
    font-size: 1.8em;
  }

  .tiptap h2 {
    font-size: 1.5em;
  }

  .tiptap h3 {
    font-size: 1.25em;
  }

  .tiptap ul,
  .tiptap ol {
    padding-left: 1.4em;
    margin: 0.6em 0;
  }

  .tiptap ul {
    list-style: disc;
  }

  .tiptap ol {
    list-style: decimal;
  }

  .tiptap blockquote {
    margin: 0.8em 0;
    padding-left: 1em;
    border-left: 3px solid var(--tt-border);
    color: #555;
  }

  .tiptap code {
    padding: 2px 4px;
    font-size: 0.9em;
    background: #f1f1f5;
    border-radius: 4px;
  }

  /* 代码块（NodeView 渲染为 行号栏 + pre 的组合，见 CodeBlockLineNumbers.ts） */
  .tiptap .tiptap-code-block {
    display: flex;
    margin: 0.8em 0;
    font-size: 0.9em;
    background: #f6f6f9;
    border-radius: 6px;
  }

  .tiptap .tiptap-code-block__gutter {
    flex-shrink: 0;
    padding: 12px 0 12px 14px;
    text-align: right;
    color: #98a1ab;
    user-select: none;
    cursor: default;
  }

  .tiptap .tiptap-code-block__gutter span {
    display: block;
    min-width: 2ch;
    padding-right: 1ch;
  }

  .tiptap .tiptap-code-block pre {
    flex: 1;
    min-width: 0;
    margin: 0;
    padding: 12px 14px;
    overflow-x: auto;
  }

  .tiptap pre {
    margin: 0.8em 0;
    padding: 12px 14px;
    font-size: 0.9em;
    background: #f6f6f9;
    border-radius: 6px;
    overflow-x: auto;
  }

  .tiptap pre code {
    padding: 0;
    background: none;
  }

  .tiptap hr {
    margin: 1.2em 0;
    border: none;
    border-top: 1px solid var(--tt-border);
  }

  .tiptap a {
    color: var(--tt-accent);
    text-decoration: underline;
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
    background: #fff;
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
