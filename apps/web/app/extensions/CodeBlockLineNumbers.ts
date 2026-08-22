import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'

/**
 * 带行号的语法高亮代码块。
 *
 * 在 CodeBlockLowlight 基础上通过自定义 NodeView 渲染：行号栏（gutter）挂在
 * <code> 内容区**外部**，与可编辑内容完全隔离。之前尝试过把行号作为
 * Decoration.widget 插进内容流，但 contenteditable=false 的行号和低亮扩展的
 * 高亮装饰器冲突：高亮首次生效时文本节点被替换重建，浏览器选区塌陷后落在
 * 行号旁边，光标会被错误地同步到代码块开头。外挂式行号栏彻底规避了这个问题，
 * 这也是 Tiptap 官方 Line Numbers 扩展采用的架构。
 */
export const CodeBlockLineNumbers = CodeBlockLowlight.extend({
  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'tiptap-code-block'

      // 行号栏（不可编辑，也不在内容区内）
      const gutter = document.createElement('div')
      gutter.className = 'tiptap-code-block__gutter'
      gutter.setAttribute('contenteditable', 'false')

      const pre = document.createElement('pre')
      const code = document.createElement('code')
      if (node.attrs.language) {
        code.classList.add(`language-${node.attrs.language}`)
      }
      pre.appendChild(code)

      wrapper.appendChild(gutter)
      wrapper.appendChild(pre)

      // 根据内容行数渲染行号
      const renderGutter = () => {
        const lineCount = Math.max(1, node.textContent.split('\n').length)
        while (gutter.childElementCount < lineCount) {
          const num = document.createElement('span')
          num.textContent = String(gutter.childElementCount + 1)
          gutter.appendChild(num)
        }
        while (gutter.childElementCount > lineCount) {
          gutter.lastElementChild?.remove()
        }
      }
      renderGutter()

      // 内容区内的编辑不经过 NodeView.update，用 MutationObserver 跟踪行数变化
      const observer = new MutationObserver(renderGutter)
      observer.observe(code, { childList: true, subtree: true, characterData: true })

      return {
        dom: wrapper,
        contentDOM: code,
        update(updatedNode) {
          if (updatedNode.type.name !== node.type.name) {
            return false
          }
          node = updatedNode
          code.className = node.attrs.language ? `language-${node.attrs.language}` : ''
          renderGutter()
          return true
        },
        destroy() {
          observer.disconnect()
        },
      }
    }
  },
})
