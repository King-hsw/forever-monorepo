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

const props = defineProps<{
  /** Markdown 源码 */
  source?: string
}>()

const html = computed(() => {
  if (!props.source) {
    return ''
  }
  return decorateCodeBlocks(md.parse(props.source, { async: false }))
    // 防盗链站点会拒给带 Referer 的图片，补上 no-referrer（已手动写过的跳过）
    .replace(/<img(?![^>]*\sreferrerpolicy=)/g, '<img referrerpolicy="no-referrer"')
})

/* ---------- 点击委托：正文图片浮层预览 + 代码块复制（已复制反馈） ---------- */
const rootEl = ref<HTMLElement | null>(null)

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
      btn.textContent = '已复制 ✓'
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
</style>
