/**
 * 代码块语言注册表（highlight.js 语言定义的共享映射）。
 *
 * 渲染端用 highlight.js 的 registerLanguage、Tiptap 编辑器用 lowlight 的 register，
 * 两边必须支持同一批语言，否则会出现「编辑器里有高亮、渲染时没有高亮」的不一致。
 * 统一从这里取，避免两处清单漂移。
 *
 * 只注册常用语言以控制打包体积；需要更多语言时在这里追加即可。
 */
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

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
} as const;
