/**
 * 代码块语言注册表（highlight.js 语言定义的共享映射）。
 *
 * MarkdownView 用 highlight.js 的 registerLanguage、Tiptap 编辑器用 lowlight
 * 的 register，两边必须支持同一批语言，否则会出现「编辑器里有高亮、渲染时
 * 没有高亮」的不一致。统一从这里取，避免两处清单漂移。
 *
 * 只注册常用语言以控制打包体积；需要更多语言时在这里追加即可。
 */
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
import java from 'highlight.js/lib/languages/java'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import php from 'highlight.js/lib/languages/php'
import ruby from 'highlight.js/lib/languages/ruby'
import kotlin from 'highlight.js/lib/languages/kotlin'
import swift from 'highlight.js/lib/languages/swift'
import diff from 'highlight.js/lib/languages/diff'

// key 为语言名或别名（别名需显式注册，core 版 highlight.js 不会自动解析）
export const codeLanguages = {
  javascript,
  js: javascript,
  typescript,
  ts: typescript,
  bash,
  sh: bash,
  shell,
  json,
  css,
  xml,
  html: xml,
  python,
  py: python,
  markdown,
  md: markdown,
  yaml,
  yml: yaml,
  java,
  c,
  cpp,
  csharp,
  cs: csharp,
  go,
  rust,
  sql,
  php,
  ruby,
  kotlin,
  kt: kotlin,
  swift,
  diff,
} as const
