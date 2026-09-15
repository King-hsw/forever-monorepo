import { renderTableToMarkdown, Table } from '@tiptap/extension-table'
import type { JSONContent, MarkdownRendererHelpers } from '@tiptap/core'

/**
 * 序列化期的哨兵字符，占位「单元格文本里的字面量 |」。
 *
 * 用 Unicode 私有区字符：正常正文不会出现，且不会被 @tiptap/markdown 的
 * 文本转义逻辑（encodeTextForMarkdown）当作特殊字符处理。
 */
const PIPE_SENTINEL = '\uE000'

/** 代码 mark 内的文本按原样保留，不走转义（详见下方 protectPipes 注释） */
function hasCodeMark(node: JSONContent): boolean {
  return !!node.marks?.some(mark => mark.type === 'code')
}

/**
 * 递归把表格内「非代码」文本节点里的字面量 `|` 替换为哨兵字符。
 *
 * 为什么需要这一步：`@tiptap/markdown` 的 escapeMarkdownSyntax 会转义
 * `*` `_` `[` `` ` `` `\` 等行内语法字符，**唯独漏了 `|`**（它只在表格语境
 * 里有意义）。而 GFM 表格用 `|` 分列，单元格文本里的裸 `|` 会被下一次解析
 * 当成列分隔符：`| a|b | 正常 |` 会解析成 4 个格子，表格只有 2 列，
 * 结果是 `a|b` 被拆散、相邻单元格的「正常」直接丢失——静默的数据损坏。
 *
 * 不能在文本里直接写 `\|`：renderChildren 会把反斜杠再转义一次
 * （`a\|b` → `a\\|b`），`\\` 解析回来是字面反斜杠加列分隔符，同样破坏结构。
 * 所以先用哨兵占位，等官方渲染流程跑完、反斜杠转义已经定型之后，
 * 再在整段输出的末尾把哨兵换回 `\|`（见 renderMarkdown）。
 *
 * 代码 mark 内的 `|` 不需要处理：marked 的 splitCells 会跳过反引号 span 内的
 * 管道符，@tiptap/markdown 的 preprocessTablePipes 也已在解析侧做了对应转义，
 * 往返本来就成立；强行插入反斜杠反而会污染代码内容。
 *
 * 只在真正发生替换时重建节点，表格无管道符时原样返回，避免每次 onUpdate
 * 都深拷贝一份文档树。
 */
function protectPipes(node: JSONContent): JSONContent {
  if (node.type === 'text') {
    if (!node.text?.includes('|') || hasCodeMark(node)) {
      return node
    }
    return { ...node, text: node.text.replace(/\|/g, PIPE_SENTINEL) }
  }

  if (!node.content?.length) {
    return node
  }

  let changed = false
  const content = node.content.map((child) => {
    const next = protectPipes(child)
    if (next !== child) {
      changed = true
    }
    return next
  })

  return changed ? { ...node, content } : node
}

/**
 * 表格（Markdown 序列化安全版）。
 *
 * 与官方 Table 的唯一区别在序列化出口：先把单元格里的字面量 `|` 保护起来，
 * 渲染完成后再还原成反斜杠转义形式，保证「单元格含竖线」的表格往返不丢数据。
 * 解析侧无需改动，官方实现已经能正确还原 `\|`。
 *
 * 注意：官方 renderTableToMarkdown 只输出 GFM 表格，colspan / rowspan 一律
 * 不参与序列化。所以本项目不提供合并/拆分单元格能力，粘贴进来的合并表格会在
 * 清洗阶段被平铺（见 app/utils/pasteTable.ts），确保编辑态所见即保存所得。
 */
export const TableMarkdownSafe = Table.extend({
  renderMarkdown(node: JSONContent, helpers: MarkdownRendererHelpers): string {
    const markdown = renderTableToMarkdown(protectPipes(node), helpers)
    return markdown.includes(PIPE_SENTINEL)
      ? markdown.replaceAll(PIPE_SENTINEL, '\\|')
      : markdown
  },
})
