import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'

/** 复制成功后的反馈展示时长 */
const COPY_FEEDBACK_MS = 1500

/** 把文本写入剪贴板，优先用异步 Clipboard API，失败时退回 execCommand */
function copyToClipboard(text: string): Promise<void> {
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

/**
 * 带行号、语法高亮及右上角工具条（语言选择 + 复制）的代码块。
 *
 * 在 CodeBlockLowlight 基础上通过自定义 NodeView 渲染：行号栏（gutter）和悬浮
 * 工具条（toolbar）都挂在 <code> 内容区**外部**，与可编辑内容完全隔离。之前尝试过把行号作为
 * Decoration.widget 插进内容流，但 contenteditable=false 的行号和低亮扩展的
 * 高亮装饰器冲突：高亮首次生效时文本节点被替换重建，浏览器选区塌陷后落在
 * 行号旁边，光标会被错误地同步到代码块开头。外挂式行号栏彻底规避了这个问题，
 * 这也是 Tiptap 官方 Line Numbers 扩展采用的架构。
 */
export const CodeBlockLineNumbers = CodeBlockLowlight.extend({
  addNodeView() {
    // addNodeView 的 this 上挂有 name/options/storage/editor/type（见 @tiptap/core 的 Node config 类型），
    // 这里用它拿到 lowlight 实例，枚举出已注册的语言供下拉框选择
    const lowlight = this.options.lowlight as
      | { listLanguages?: () => string[] }
      | undefined
    let languages: string[] = []
    try {
      languages = lowlight?.listLanguages?.() ?? []
    } catch {
      languages = []
    }

    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'tiptap-code-block'

      // 右上角悬浮工具条：语言选择 + 复制按钮。
      // 与行号栏一样放在可编辑内容区之外，contenteditable=false，避免干扰光标和选区
      const toolbar = document.createElement('div')
      toolbar.className = 'tiptap-code-block__toolbar'
      toolbar.setAttribute('contenteditable', 'false')

      const languageSelect = document.createElement('select')
      languageSelect.className = 'tiptap-code-block__language-select'
      languageSelect.title = '代码语言'
      languageSelect.appendChild(new Option('纯文本', ''))
      for (const language of languages) {
        languageSelect.appendChild(new Option(language, language))
      }
      languageSelect.value = (node.attrs.language as string | null) || ''

      // 切换语言：参考 @tiptap/core 中 NodeView.updateAttributes 的实现，
      // 用 setNodeMarkup 在当前节点位置更新 attributes。语言变更后 <code> 的
      // class 由下方 update() 回调统一同步
      languageSelect.addEventListener('change', () => {
        const pos = getPos()
        if (typeof pos !== 'number') {
          return
        }
        const { tr } = editor.view.state
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          language: languageSelect.value || null,
        })
        editor.view.dispatch(tr)
      })

      const copyButton = document.createElement('button')
      copyButton.type = 'button'
      copyButton.className = 'tiptap-code-block__copy-button'
      copyButton.textContent = '复制'
      let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined
      copyButton.addEventListener('click', () => {
        copyToClipboard(node.textContent ?? '')
          .then(() => {
            copyButton.textContent = '已复制'
            copyButton.classList.add('is-copied')
            clearTimeout(copyFeedbackTimer)
            copyFeedbackTimer = setTimeout(() => {
              copyButton.textContent = '复制'
              copyButton.classList.remove('is-copied')
            }, COPY_FEEDBACK_MS)
          })
          .catch(() => {})
      })

      toolbar.appendChild(languageSelect)
      toolbar.appendChild(copyButton)

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
      wrapper.appendChild(toolbar)

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
          languageSelect.value = (node.attrs.language as string | null) || ''
          renderGutter()
          return true
        },
        // 工具条上的交互（点开下拉、点击复制）不交给 ProseMirror 处理，
        // 否则可能把选区/光标错误地移动到代码块上
        stopEvent(event) {
          return toolbar.contains(event.target as globalThis.Node)
        },
        destroy() {
          observer.disconnect()
        },
      }
    }
  },
})
