<template>
  <div class="markdown-view" v-html="html"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js/lib/core'
import { codeLanguages } from '../utils/codeLanguages'
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

const props = defineProps<{
  /** Markdown 源码 */
  source?: string
}>()

const html = computed(() => {
  if (!props.source) {
    return ''
  }
  return md.parse(props.source, { async: false })
})
</script>
