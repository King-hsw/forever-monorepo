<template>
  <div class="markdown-view" v-html="html"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js/lib/core'
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

// 只注册常用语言，控制打包体积
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('shell', shell)
hljs.registerLanguage('json', json)
hljs.registerLanguage('css', css)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('python', python)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)

// 语言未注册时转义 HTML，防止裸代码里的 < > & 被当作标签渲染
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// 每一行包一层 <span class="line">，配合 CSS counter 显示行号
const withLineNumbers = (value: string) =>
  value
    .split('\n')
    .map((line) => `<span class="line">${line}</span>`)
    .join('\n')

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

<style>
/* GitHub 风格 Markdown 渲染 */
.markdown-view {
  font-size: 15px;
  line-height: 1.7;
  color: #24292f;
  word-break: break-word;

  & > :first-child {
    margin-top: 0;
  }

  & > :last-child {
    margin-bottom: 0;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-weight: 600;
    line-height: 1.3;
    margin: 1.2em 0 0.6em;
  }

  h1 {
    font-size: 1.6em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #eaecef;
  }

  h2 {
    font-size: 1.35em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #eaecef;
  }

  h3 {
    font-size: 1.15em;
  }

  p {
    margin: 0.6em 0;
  }

  ul,
  ol {
    padding-left: 1.5em;
    margin: 0.6em 0;
  }

  ul {
    list-style: disc;
  }

  ol {
    list-style: decimal;
  }

  a {
    color: #0969da;
    text-decoration: underline;
  }

  blockquote {
    margin: 0.8em 0;
    padding: 0 1em;
    border-left: 4px solid #d0d7de;
    color: #57606a;
  }

  code {
    padding: 0.2em 0.4em;
    font-size: 0.9em;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: rgba(175, 184, 193, 0.2);
    border-radius: 6px;
  }

  pre {
    margin: 0.8em 0;
    padding: 16px;
    background: #f6f8fa;
    border-radius: 8px;
    overflow-x: auto;
    line-height: 1.5;
    counter-reset: line;
  }

  pre code {
    padding: 0;
    background: none;
    border-radius: 0;
    font-size: 0.9em;
  }

  /* 代码块行号：每行一个 .line，用 counter 递增 */
  pre code .line {
    display: block;
    counter-increment: line;
  }

  pre code .line::before {
    content: counter(line);
    display: inline-block;
    min-width: 3ch;
    margin-right: 1em;
    text-align: right;
    color: #8b949e;
    user-select: none;
  }

  hr {
    margin: 1.5em 0;
    border: none;
    border-top: 1px solid #d0d7de;
  }

  img {
    max-width: 100%;
    border-radius: 6px;
  }

  table {
    border-collapse: collapse;
    margin: 0.8em 0;
  }

  th,
  td {
    border: 1px solid #d0d7de;
    padding: 6px 12px;
  }

  th {
    background: #f6f8fa;
  }

  del {
    color: #57606a;
  }
}
</style>
