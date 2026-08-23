/**
 * 把文本写入剪贴板（MarkdownView 渲染的代码块与 Tiptap 编辑器共用）。
 *
 * 优先用异步 Clipboard API；http 等非安全上下文下不可用，
 * 退回隐藏 textarea + execCommand 的同步方案。
 */
export function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      resolve()
    } catch (error) {
      reject(error)
    } finally {
      textarea.remove()
    }
  })
}
