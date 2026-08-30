<template>
  <div ref="rootEl" class="markdown-view" v-html="html" @click="onClick" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js/lib/core'
import { codeLanguages } from '../utils/codeLanguages'
import { openPhotoPreview } from '../composables/usePhotoPreview'
import 'highlight.js/styles/github.css'

// 与 TiptapEditor 共用同一份语言清单（含别名），保证编辑器和渲染的高亮能力一致
for (const [name, language] of Object.entries(codeLanguages)) {
  hljs.registerLanguage(name, language)
}

// 语言未注册时转义 HTML，防止裸代码里的 < > & 被当作标签渲染
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// 每一行包一层 <span class="line">，配合 CSS counter 显示行号
//
// 注意：hljs 高亮后的 HTML 中，块注释 / 模板字符串等 token 的 <span>
// 可能横跨多行。不能直接按 '\n' 切分——那会把标签拦腰截断，产生非法的
// 嵌套 HTML：后续行的闭合标签会错位配对，内容被包进上一行的 token 里，
// 导致高亮颜色错乱甚至丢失。
// 这里按「标签感知」的方式切分：遇到换行时先补上所有未闭合的标签，
// 再在新行开头按原顺序重新打开它们，保证每行都是独立合法的 HTML。
const withLineNumbers = (highlightedHtml: string): string => {
  const parts = highlightedHtml.split(/(<[^>]+>)/g)
  const lines: string[] = []
  const openTags: string[] = []
  let current = ''

  const closeLine = () => {
    // 先闭合行内未闭合的 token 标签，再闭合本行的 .line 标签
    lines.push(`<span class="line">${current}${'</span>'.repeat(openTags.length)}</span>`)
    // 新行开头重新打开跨行的标签，保持 token 的颜色作用域
    current = openTags.join('')
  }

  for (const part of parts) {
    if (!part) {
      continue
    }
    if (part.startsWith('<')) {
      if (part.startsWith('</')) {
        openTags.pop()
      } else if (!part.endsWith('/>')) {
        openTags.push(part)
      }
      current += part
    } else {
      part.split('\n').forEach((segment, index) => {
        if (index > 0) {
          closeLine()
        }
        current += segment
      })
    }
  }
  lines.push(`<span class="line">${current}${'</span>'.repeat(openTags.length)}</span>`)

  return lines.join('\n')
}

// 使用独立 marked 实例：
// 1) 避免被 Tiptap Markdown 扩展注册到全局 marked 的 tokenizer 污染
// 2) markedHighlight 只影响本实例
const md = new Marked()
md.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    emptyLangClass: 'hljs',
    highlight: (code, _lang, info) => {
      const name = info.trim().split(' ')[0]
      const highlighted =
        name && hljs.getLanguage(name)
          ? hljs.highlight(code, { language: name }).value
          : escapeHtml(code)
      return withLineNumbers(highlighted)
    },
  }),
)

/** 复制成功后的反馈展示时长（与编辑器代码块的复制反馈一致） */
const COPY_FEEDBACK_MS = 1500

/** 复制成功反馈里的小对勾（内联 SVG，随按钮文字颜色） */
const CHECK_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" style="vertical-align:-1px" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>'

/**
 * 给每个高亮代码块包一层外壳：右上角工具条（语言标签 + 复制按钮），
 * 与 Tiptap 编辑器的代码块工具条保持同一交互。
 *
 * marked-highlight 的产物固定为 <pre><code class="hljs[ language-x]">…</code></pre>，
 * 正文已转义不会嵌套闭合标签，可安全地整块正则替换。
 */
const decorateCodeBlocks = (html: string): string =>
  html.replace(
    /<pre><code class="hljs(?: language-([\w+#.-]+))?">([\s\S]*?)<\/code><\/pre>/g,
    (_, lang: string | undefined, body: string) => {
      const langAttr = lang ? ` language-${lang}` : ''
      return (
        `<div class="md-code-block">`
        + `<div class="md-code-block__bar">`
        + `<span class="md-code-block__dots" aria-hidden="true"><i></i><i></i><i></i></span>`
        + `<span class="md-code-block__lang">${lang ?? '纯文本'}</span>`
        + `<button type="button" class="md-code-block__copy">复制</button>`
        + `</div>`
        + `<pre><code class="hljs${langAttr}">${body}</code></pre>`
        + `</div>`
      )
    },
  )

/**
 * 给「非正文段落」打 md-nonprose 标：整段剥掉链接 / 图片 / 换行后
 * 不再有任何实际内容的段落（典型：参考文献一节整行一个链接、独立成段的配图）。
 * prose.css 据此取消其首行缩进——首行缩进只留给真正的正文文字段落。
 * marked 输出的 <p> 恒为裸标签，可安全地按 <p>…</p> 整块匹配。
 */
const markNonProseParagraphs = (html: string): string =>
  html.replace(/<p>([\s\S]*?)<\/p>/g, (whole, inner: string) =>
    inner
      .replace(/<a\b[^>]*>[\s\S]*?<\/a>|<img\b[^>]*>|<br\s*\/?>/gi, '')
      .trim()
      ? whole
      : `<p class="md-nonprose">${inner}</p>`,
  )

const props = defineProps<{
  /** Markdown 源码 */
  source?: string
}>()

const html = computed(() => {
  if (!props.source) {
    return ''
  }
  return markNonProseParagraphs(
    decorateCodeBlocks(md.parse(props.source, { async: false }))
      // 防盗链站点会拒给带 Referer 的图片，补上 no-referrer（已手动写过的跳过）
      .replace(/<img(?![^>]*\sreferrerpolicy=)/g, '<img referrerpolicy="no-referrer"')
      // 表格包一层圆角边框容器，窄屏可横向滚动（样式见 prose.css .md-table-wrap）
      .replace(/<table>/g, '<div class="md-table-wrap"><table>')
      .replace(/<\/table>/g, '</table></div>'),
  )
})

/* ---------- 点击委托：正文图片浮层预览 + 代码块复制（已复制反馈） ---------- */
const rootEl = ref<HTMLElement | null>(null)

/* ---------- 加载失败委托：正文图为 v-html 直插，挂不了模板事件；error 不冒泡，用捕获阶段在容器上接管 ---------- */

/** 占位里的小裂图（与 SafeImage 的 lucide:image-off 同源） */
const IMG_FALLBACK_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g><path d="m2 2l20 20M10.41 10.41a2 2 0 1 1-2.83-2.83m5.92 5.92L6 21m12-9l3 3"/><path d="M3.59 3.59A2 2 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59M21 15V5a2 2 0 0 0-2-2H9"/></g></svg>'

function replaceFailedImg(img: HTMLImageElement) {
  // 替换为占位块，避免渲染成破图；占位无 img，点击不会再触发预览
  const ph = document.createElement('span')
  ph.className = 'md-img-fallback'
  ph.innerHTML = `${IMG_FALLBACK_SVG}<span>图片加载失败</span>`
  img.replaceWith(ph)
}

function onMediaError(event: Event) {
  const target = event.target as HTMLElement
  if (target.tagName !== 'IMG' || !rootEl.value?.contains(target)) return
  replaceFailedImg(target as HTMLImageElement)
}

onMounted(() => {
  rootEl.value?.addEventListener('error', onMediaError, true)
  // SSR：img 在浏览器解析 HTML 时就开始加载，失败可能早于本委托挂载（error 不冒泡，
  // 那时事件已无人接收）。挂载后按加载状态补扫一遍；仍在加载中的由委托接管。
  rootEl.value?.querySelectorAll('img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0) replaceFailedImg(img)
  })
})

onBeforeUnmount(() => {
  rootEl.value?.removeEventListener('error', onMediaError, true)
})

/** 每个按钮各自的恢复定时器（WeakMap 随节点回收） */
const resetTimers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>()

function onClick(event: MouseEvent) {
  // 正文图片：整篇文章的图片作为同一画廊，从点中的这张开始
  const target = event.target as HTMLElement
  const img = target.closest('img')
  if (img && rootEl.value) {
    const list = Array.from(rootEl.value.querySelectorAll('img'))
    const index = list.indexOf(img)
    if (index >= 0)
      void openPhotoPreview(list.map(el => el.src), index, img)
    return
  }

  const btn = target.closest<HTMLButtonElement>('.md-code-block__copy')
  if (!btn || btn.disabled) return
  const code = btn.closest('.md-code-block')?.querySelector('pre')?.textContent ?? ''
  navigator.clipboard.writeText(code)
    .then(() => {
      btn.innerHTML = `已复制 ${CHECK_SVG}`
      btn.classList.add('is-copied')
      btn.disabled = true
      clearTimeout(resetTimers.get(btn))
      resetTimers.set(btn, setTimeout(() => {
        btn.textContent = '复制'
        btn.classList.remove('is-copied')
        btn.disabled = false
      }, COPY_FEEDBACK_MS))
    })
    .catch(() => {})
}
</script>

<style scoped>
/* 正文图片可点：统一浮层预览 */
:deep(img) {
  cursor: zoom-in;
}

/* 加载失败图的占位块（事件委托动态插入，非模板节点） */
:deep(.md-img-fallback) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 6px 0;
  padding: 20px;
  font-size: 12.5px;
  color: var(--c-text-muted);
  background: var(--c-bg-soft);
  border: 1px dashed var(--c-border);
  border-radius: 6px;
}

:deep(.md-img-fallback svg) {
  flex-shrink: 0;
  opacity: 0.55;
}
</style>
