import { EditorState, Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Extension } from '@tiptap/vue-3'

const pluginKey = new PluginKey<DecorationSet>('codeBlockLineNumbers')

function createLineWidget(line: number): HTMLElement {
  const span = document.createElement('span')
  span.className = 'tiptap-line-number'
  span.textContent = String(line)
  span.contentEditable = 'false'
  return span
}

// 给每个 codeBlock 的每一行行首插入一个行号 widget
function buildDecorationSet(state: EditorState): DecorationSet {
  const decorations: Decoration[] = []

  // 回调签名为 (node, pos)，pos 是节点起始位置（相对 doc）
  state.doc.descendants((node, nodePos) => {
    if (node.type.name !== 'codeBlock') {
      return true
    }

    const lines = node.textContent.split('\n')
    let charOffset = 0
    for (let i = 0; i < lines.length; i++) {
      decorations.push(
        Decoration.widget(nodePos + 1 + charOffset, () => createLineWidget(i + 1), {
          side: 1,
        }),
      )
      charOffset += lines[i].length + 1
    }

    // 代码块里只有文本，无需继续向下遍历
    return false
  })

  return DecorationSet.create(state.doc, decorations)
}

const lineNumbersPlugin = new Plugin<DecorationSet>({
  key: pluginKey,
  state: {
    init: (_config, state) => buildDecorationSet(state),
    // 注意：prosemirror-state 1.4+ 的签名是 (tr, value, oldState, newState)
    apply: (transaction, decorations, _oldState, state) => {
      if (!transaction.docChanged) {
        return decorations
      }
      return buildDecorationSet(state)
    },
  },
  props: {
    decorations: (state) => pluginKey.getState(state),
  },
})

/**
 * 代码块行号扩展：在 Tiptap 编辑器的代码块行首显示行号（纯装饰，不进入文档内容）
 */
export const CodeBlockLineNumbers = Extension.create({
  name: 'codeBlockLineNumbers',

  addProseMirrorPlugins() {
    return [lineNumbersPlugin]
  },
})
