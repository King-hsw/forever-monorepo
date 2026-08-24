/**
 * 把文本写入剪贴板（MarkdownView 渲染的代码块与 Tiptap 编辑器共用）。
 * 站点为 HTTPS（含 localhost 开发），navigator.clipboard 全程可用。
 */
export function copyText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}
