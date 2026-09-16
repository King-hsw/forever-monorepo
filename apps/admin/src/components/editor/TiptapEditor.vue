<template>
  <div class="tiptap-editor" :class="{ 'tiptap-editor--fluid': fluid }">
    <!-- 工具栏 -->
    <div v-if="editor" class="tiptap-editor__toolbar">
      <div class="tiptap-editor__group">
        <button
          type="button"
          title="撤销 (⌘Z)"
          :disabled="!editor.can().undo()"
          @click="editor.chain().focus().undo().run()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
          </svg>
        </button>
        <button
          type="button"
          title="重做 (⌘⇧Z)"
          :disabled="!editor.can().redo()"
          @click="editor.chain().focus().redo().run()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m15 14 5-5-5-5" />
            <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13" />
          </svg>
        </button>
      </div>

      <div class="tiptap-editor__group">
        <button
          type="button"
          title="正文"
          :class="{ 'is-active': editor.isActive('paragraph') }"
          @click="editor.chain().focus().setNode('paragraph').run()"
        >
          正文
        </button>
        <button
          type="button"
          title="标题 1"
          :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
          @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
        >
          H1
        </button>
        <button
          type="button"
          title="标题 2"
          :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
        >
          H2
        </button>
        <button
          type="button"
          title="标题 3"
          :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
          @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
        >
          H3
        </button>
      </div>

      <div class="tiptap-editor__group">
        <button
          type="button"
          title="加粗 (⌘B)"
          :class="{ 'is-active': editor.isActive('bold') }"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          title="斜体 (⌘I)"
          :class="{ 'is-active': editor.isActive('italic') }"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          title="下划线 (⌘U)"
          :class="{ 'is-active': editor.isActive('underline') }"
          @click="editor.chain().focus().toggleUnderline().run()"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          title="删除线"
          :class="{ 'is-active': editor.isActive('strike') }"
          @click="editor.chain().focus().toggleStrike().run()"
        >
          <s>S</s>
        </button>
      </div>

      <div class="tiptap-editor__group">
        <button
          type="button"
          title="行内代码"
          :class="{ 'is-active': editor.isActive('code') }"
          @click="editor.chain().focus().toggleCode().run()"
        >
          &lt;/&gt;
        </button>
        <button
          type="button"
          title="代码块"
          :class="{ 'is-active': editor.isActive('codeBlock') }"
          @click="editor.chain().focus().toggleCodeBlock().run()"
        >
          代码块
        </button>
        <button
          type="button"
          title="引用"
          :class="{ 'is-active': editor.isActive('blockquote') }"
          @click="editor.chain().focus().toggleBlockquote().run()"
        >
          引用
        </button>
      </div>

      <div class="tiptap-editor__group">
        <button
          type="button"
          title="无序列表"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          @click="editor.chain().focus().toggleBulletList().run()"
        >
          • 列表
        </button>
        <button
          type="button"
          title="有序列表"
          :class="{ 'is-active': editor.isActive('orderedList') }"
          @click="editor.chain().focus().toggleOrderedList().run()"
        >
          1. 列表
        </button>
        <button type="button" title="分割线" @click="editor.chain().focus().setHorizontalRule().run()">―</button>
      </div>

      <div class="tiptap-editor__group">
        <button
          type="button"
          title="插入/移除链接"
          :class="{ 'is-active': editor.isActive('link') }"
          @click="toggleLink"
        >
          链接
        </button>
        <button type="button" title="插入图片" :disabled="uploading" @click="pickImage">
          {{ uploading ? `上传中 ${uploadPercent}%` : '图片' }}
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
            <div
              class="tiptap-editor__table-picker-grid"
              @mouseleave="
                hoverRow = 0;
                hoverCol = 0;
              "
            >
              <template v-for="r in TABLE_PICKER_MAX" :key="r">
                <button
                  v-for="c in TABLE_PICKER_MAX"
                  :key="`${r}-${c}`"
                  type="button"
                  class="tiptap-editor__table-picker-cell"
                  :class="{ 'is-on': r <= hoverRow && c <= hoverCol }"
                  @mouseenter="
                    hoverRow = r;
                    hoverCol = c;
                  "
                  @click="insertTable(r, c)"
                />
              </template>
            </div>
            <p class="tiptap-editor__table-picker-label">
              {{ hoverRow && hoverCol ? `${hoverRow} 行 × ${hoverCol} 列` : '拖选行列数' }}
            </p>
            <p class="tiptap-editor__table-picker-hint">首行作为表头（Markdown 表格语法的要求）</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑区域；header 插槽用于在正文上方放标题等自定义内容（文章编辑页的大标题输入） -->
    <div class="tiptap-editor__body">
      <slot name="header" />
      <editor-content :editor="editor" class="tiptap-editor__content" />
    </div>

    <!-- 隐藏的图片选择输入框 -->
    <input
      ref="imageInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      multiple
      hidden
      @change="onImagePicked"
    />

    <!-- 链接输入弹窗 -->
    <dialog v-if="showLinkDialog" open class="tiptap-editor__dialog" @close="closeLinkDialog">
      <form @submit.prevent="confirmLink">
        <h3>插入链接</h3>
        <input v-model="linkUrl" type="text" placeholder="https://example.com" autofocus @input="linkError = ''" />
        <p v-if="linkError" class="tiptap-editor__dialog-error">
          {{ linkError }}
        </p>
        <div class="tiptap-editor__dialog-actions">
          <button type="button" @click="closeLinkDialog">取消</button>
          <button type="submit" class="primary" :disabled="!linkUrl">确定</button>
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
import 'highlight.js/styles/github.css';
import './styles/prose.less';
import './styles/editor.less';

import Code from '@tiptap/extension-code';
import Image from '@tiptap/extension-image';
import { TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import type { LanguageFn } from 'highlight.js';
import { createLowlight } from 'lowlight';
import type { marked } from 'marked';
import { Marked } from 'marked';
import { MessagePlugin } from 'tdesign-vue-next';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { CodeBlockLineNumbers } from './extensions/CodeBlockLineNumbers';
import { TableMarkdownSafe } from './extensions/TableMarkdownSafe';
import { codeLanguages } from './utils/codeLanguages';
import { isSupportedImage, uploadImageFile } from './utils/imageUpload';
import { containsTable, normalizePastedTableHtml } from './utils/pasteTable';

const props = withDefaults(
  defineProps<{
    /** 初始内容的解析方式：后端正文存的是 Markdown 还是 HTML */
    contentFormat?: 'markdown' | 'html';
    /** 撑满父容器高度（用于分栏布局） */
    fluid?: boolean;
  }>(),
  {
    contentFormat: 'markdown',
    fluid: false,
  },
);

// 用 defineModel 而非 defineEmits 声明 v-model：
// 组件库的 lint 规则要求自定义事件名 kebab-case，而 v-model 约定的事件名是
// update:modelValue（camelCase），声明成 kebab-case 后端根本收不到事件。
const modelValue = defineModel<string>({ default: '' });
const markdown = defineModel<string>('markdown', { default: '' });

// 与渲染端共用同一份语言清单，保证两边高亮能力一致
const lowlight = createLowlight();
lowlight.register(codeLanguages as Record<string, LanguageFn>);

const editor = useEditor({
  // 初始内容优先取 Markdown（后端存储格式）；contentFormat 为 html 时按 HTML 解析，
  // 否则字符串会被当作 HTML 处理，导致 Markdown 源码原样显示、不渲染
  content: markdown.value || modelValue.value,
  contentType: props.contentFormat,
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
    // 图片：正文里存对象存储返回的绝对地址；补充 referrerpolicy=no-referrer，
    // 避免防盗链站点拒给图片
    Image.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          referrerpolicy: { default: 'no-referrer' },
        };
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
  onUpdate: ({ editor }) => {
    modelValue.value = editor.getHTML();
    markdown.value = editor.getMarkdown();
  },
  // 拦截粘贴 / 拖拽的图片文件（走上传），以及含 Markdown 语法的纯文本（弹窗确认是否转换）
  editorProps: {
    handlePaste: (_view, event) => {
      const files = event.clipboardData?.files;
      if (files?.length && Array.from(files).some(isSupportedImage)) {
        void insertImageFiles(files);
        return true;
      }
      const ed = editor.value;
      if (!ed) {
        return false;
      }
      // 代码块/行内代码内粘贴保持纯文本，避免代码被解析成富节点
      if (ed.isActive('codeBlock') || ed.isActive('code')) {
        return false;
      }
      const cd = event.clipboardData;
      const html = cd?.getData('text/html');
      // 含表格的富文本先清洗再插入：平铺合并单元格、首行提升为表头、去掉来源噪音，
      // 让编辑态结构与保存后的 GFM 结构完全一致（详见 utils/pasteTable.ts）
      if (containsTable(html)) {
        // 单元格内再粘一张表会形成嵌套表格，而 GFM 语法表达不了嵌套，
        // 序列化必然损坏——退化为纯文本插入，由用户自行取舍内容
        if (ed.isActive('table')) {
          const text = cd?.getData('text/plain')?.trim();
          if (text) {
            event.preventDefault();
            // 传 JSON 而非字符串：字符串会被 Tiptap 按 HTML 解析，纯文本里的
            // 尖括号会被当成标签吃掉
            ed.chain()
              .focus()
              .insertContent([{ type: 'text', text }])
              .run();
            return true;
          }
          return false;
        }
        const cleaned = normalizePastedTableHtml(html as string);
        if (cleaned) {
          event.preventDefault();
          // 传 HTML 字符串，交给 ProseMirror 按 schema 解析成表格节点
          ed.chain().focus().insertContent(cleaned).run();
          return true;
        }
      }
      // 其余富文本（HTML）粘贴走默认行为
      if (html) {
        return false;
      }
      const text = cd?.getData('text/plain')?.trim();
      if (!text || !MARKDOWN_RE.test(text)) {
        return false;
      }
      // 检测到 Markdown 语法：拦截并弹窗，由用户决定是否转换
      event.preventDefault();
      pendingPasteText.value = text;
      showPasteDialog.value = true;
      return true;
    },
    handleDrop: (view, event) => {
      const files = event.dataTransfer?.files;
      if (!files?.length || !Array.from(files).some(isSupportedImage)) {
        return false;
      }
      event.preventDefault();
      // 计算落点位置，图片插入到鼠标松开的地方；多张时逐个往后排
      const dropPos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
      void insertImageFiles(files, dropPos);
      return true;
    },
  },
});

/** 上传状态（工具栏按钮据此禁用并显示进度） */
const uploading = ref(false);
const uploadPercent = ref(0);
const imageInputRef = ref<HTMLInputElement | null>(null);

function pickImage() {
  imageInputRef.value?.click();
}

function onImagePicked(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) {
    void insertImageFiles(input.files);
  }
  // 允许下次选择同一文件仍触发 change
  input.value = '';
}

/**
 * 压缩并逐张上传后插入；pos 为空时插入到当前光标处。
 * 上传失败的图片跳过并提示，不影响同批其它图片。
 */
async function insertImageFiles(files: FileList | File[], pos?: number) {
  const ed = editor.value;
  if (!ed || uploading.value) {
    return;
  }
  const images = Array.from(files).filter(isSupportedImage);
  if (!images.length) {
    return;
  }

  uploading.value = true;
  const total = images.length;
  try {
    let insertPos = pos;
    for (let i = 0; i < total; i += 1) {
      const file = images[i];
      uploadPercent.value = 0;
      try {
        const src = await uploadImageFile(file, {
          // 多图时把单张进度折算到整批进度上，避免进度条来回跳
          onProgress: (percent) => {
            uploadPercent.value = Math.round(((i + percent / 100) / total) * 100);
          },
        });
        const chain = ed.chain().focus();
        if (insertPos === undefined) {
          chain.setImage({ src });
        } else {
          // 图片节点在文档中占 1 个位置，连续插入依次后移保持顺序
          chain.insertContentAt(insertPos, { type: 'image', attrs: { src } });
          insertPos += 1;
        }
        chain.run();
      } catch (error) {
        MessagePlugin.error(`${file.name} 上传失败：${(error as Error).message}`);
      }
    }
  } finally {
    uploading.value = false;
    uploadPercent.value = 0;
  }
}

// 外部更新（v-model）时同步到编辑器
watch(modelValue, (value) => {
  const ed = editor.value;
  if (!ed) {
    return;
  }
  // 编辑器自身回传的是 HTML、父组件可能直接喂回 Markdown，两者都视为相同内容跳过
  const isSame = ed.getHTML() === value || ed.getMarkdown() === value;
  if (isSame) {
    return;
  }
  // 外部传入的正文按 contentFormat 解析后再写入
  ed.commands.setContent(value, { contentType: props.contentFormat, emitUpdate: false });
  markdown.value = ed.getMarkdown();
});

// 初始内容同步 Markdown
onMounted(() => {
  const ed = editor.value;
  if (ed) {
    markdown.value = ed.getMarkdown();
  }
});

// Markdown 粘贴确认弹窗
const showPasteDialog = ref(false);
const pendingPasteText = ref('');

// 检测常见 Markdown 块级/行内语法；命中即弹窗询问（误报只会多弹一次窗，由用户拍板）
const MARKDOWN_RE =
  /^#{1,6}\s|^```|^>|\*\*[^*\n]+\*\*|`[^`\n]+`|^\s*[-*+]\s+|^\s*\d+[.)]\s|!\[[^\]]*\]\(|\[[^\]]+\]\([^)]*\)|^(?:-{3,}|\*{3,}|_{3,})\s*$|\+\+[^+\n]+\+\+/m;

function confirmPaste(convert: boolean) {
  const text = pendingPasteText.value;
  showPasteDialog.value = false;
  pendingPasteText.value = '';
  const ed = editor.value;
  if (!ed || !text) {
    return;
  }
  if (convert) {
    // 复用 @tiptap/markdown 的解析管线（同一 marked 实例，自定义 tokenizer / 代码块行号均生效）
    ed.chain().focus().insertContent(text, { contentType: 'markdown' }).run();
  } else {
    ed.chain().focus().insertContent(text).run();
  }
}

// 链接弹窗
const showLinkDialog = ref(false);
const linkUrl = ref('');
const linkError = ref('');

function toggleLink() {
  const ed = editor.value;
  if (!ed) {
    return;
  }
  if (ed.isActive('link')) {
    ed.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  linkError.value = '';
  // 光标落在已有链接上时回填地址，方便改完直接确认
  linkUrl.value = (ed.getAttributes('link').href as string | undefined) ?? '';
  showLinkDialog.value = true;
}

function closeLinkDialog() {
  showLinkDialog.value = false;
  linkUrl.value = '';
  linkError.value = '';
}

/** 补全协议：用户常直接输 example.com，不补会存成站内相对链接（点到 /example.com 去了） */
function normalizeLinkHref(raw: string): string {
  const href = raw.trim();
  if (!href) {
    return '';
  }
  // 站内绝对路径、锚点、协议相对地址（//host）、相对路径和已带协议的都保持原样
  if (/^(?:[a-z][\d+.a-z-]*:|\/\/|[/#.])/i.test(href)) {
    return href;
  }
  return `https://${href}`;
}

function confirmLink() {
  const ed = editor.value;
  if (!ed) {
    return;
  }
  const href = normalizeLinkHref(linkUrl.value);
  if (!href) {
    linkError.value = '请输入链接地址';
    return;
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
      .run();
  } else {
    // setLink 对不在白名单里的协议（如 javascript:）返回 false 且不动文档
    if (!ed.chain().focus().setLink({ href }).run()) {
      linkError.value = '这个链接地址不被支持，请检查协议';
      return;
    }
  }
  closeLinkDialog();
}

/* ---------------- 表格 ---------------- */

/** 插入表格时可选的最大行列数（网格选择器是 8×8） */
const TABLE_PICKER_MAX = 8;

const showTablePicker = ref(false);
const hoverRow = ref(0);
const hoverCol = ref(0);
const tablePickerRef = ref<HTMLElement | null>(null);

function insertTable(rows: number, cols: number) {
  showTablePicker.value = false;
  hoverRow.value = 0;
  hoverCol.value = 0;
  // withHeaderRow 必须为 true：GFM 表格语法强制要求表头行，缺了它序列化时会
  // 补出一行空表头，展示端就多一条空白表头栏。rows 是含表头在内的总行数。
  editor.value?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
}

/** 点击选择器以外的位置收起网格选择器 */
function onDocumentPointerDown(event: PointerEvent) {
  if (showTablePicker.value && !tablePickerRef.value?.contains(event.target as Node)) {
    showTablePicker.value = false;
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown);
});
</script>
