/**
 * 粘贴外部表格（Excel / 网页 / 在线文档）时的 HTML 清洗。
 *
 * 外部来源的表格有三类问题会让「编辑态所见」和「保存后所得」不一致：
 *
 * 1. **合并单元格**：GFM Markdown 表格语法没有 colspan/rowspan 的表达方式，
 *    序列化时官方实现会直接丢弃合并信息，导致保存后行列错位。本项目已选择
 *    不支持合并，所以这里把合并区域**平铺**成独立单元格（内容留在左上角，
 *    其余补空），保证粘进来看到的行列表格结构与保存结果完全一致。
 * 2. **没有表头行**：GFM 语法强制要求表头行，无表头的表格序列化时会被补上
 *    一行空表头，展示端会出现一条空白表头栏。这里统一把首行提升为表头。
 * 3. **来源特有的噪音**：Excel 会输出 XML 命名空间、`<!--StartFragment-->`
 *    注释、`<colgroup>`、`mso-*` 内联样式、`&nbsp;` 占位等。这些对渲染无害
 *    但会污染 Markdown，统一在清洗阶段去掉。
 *
 * 单元格的对齐会被保留：HTML 的 `text-align` 正是表格扩展 align 属性的
 * 解析来源（见 parseAlign），因此导出成 `style="text-align:center"` 即可往返。
 */

/** 与表格扩展 align 属性一致的对齐取值 */
type CellAlign = 'left' | 'center' | 'right' | null;

interface GridCell {
  /** 单元格内部 HTML（已清理空白） */
  html: string;
  align: CellAlign;
}

/**
 * 清理单元格内容。
 *
 * `&nbsp;` 是 Excel 空单元格的常见占位，直接保留会在 Markdown 里变成一串
 * 不可见字符；制表符与换行在单元格内也没有意义（GFM 单元格必须在单行内），
 * 一并收敛成普通空格。`<br>` 标签本身不受影响，单元格内的软换行得以保留。
 */
function cleanCellHtml(raw: string): string {
  return raw
    .replaceAll('&nbsp;', ' ')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/** 读取单元格对齐：优先内联 style，回退旧式 align 属性（与扩展的解析逻辑一致） */
function readAlign(cell: HTMLTableCellElement): CellAlign {
  const value = (cell.style?.textAlign || cell.getAttribute('align') || '').trim().toLowerCase();

  return value === 'left' || value === 'center' || value === 'right' ? value : null;
}

/**
 * 清理来源噪音：注释节点与 col/colgroup。
 *
 * 注释来自 Excel 的 `<!--StartFragment-->`。col/colgroup 是列宽信息——
 * Markdown 表格语法里没有列宽概念，重建时本来就会被丢弃；显式清掉还顺带
 * 规避一个兼容问题：并非所有解析器都会按规范为表内裸 `<col>` 隐式补出
 * `<colgroup>`，漏补时 col 会被寄养到 table 之前，变成渲染不出来的游离节点。
 */
function stripNoise(root: HTMLElement): void {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const comments: Comment[] = [];
  while (walker.nextNode()) {
    comments.push(walker.currentNode as Comment);
  }
  for (const node of comments) node.remove();
  for (const node of root.querySelectorAll('col, colgroup')) node.remove();
}

/**
 * 把一张表格重建为「无合并、首行表头」的标准结构。
 *
 * 用网格占位法还原真实的行列布局：逐个单元格按 rowSpan/colSpan 写入 grid，
 * 被合并区域覆盖的位置记为 null，最后按列数补齐并统一输出。
 */
function rebuildTable(table: HTMLTableElement): void {
  const rows = Array.from(table.rows);
  if (!rows.length) {
    return;
  }

  const grid: (GridCell | null)[][] = [];

  rows.forEach((row, r) => {
    const currentRow = (grid[r] ??= []);
    let col = 0;

    for (const cell of Array.from(row.cells)) {
      // 跳过被上方 rowspan 占用的列
      while (col < currentRow.length && currentRow[col] !== undefined) {
        col += 1;
      }

      const rowSpan = Math.max(1, cell.rowSpan || 1);
      const colSpan = Math.max(1, cell.colSpan || 1);
      const content: GridCell = { html: cleanCellHtml(cell.innerHTML), align: readAlign(cell) };

      for (let dr = 0; dr < rowSpan; dr += 1) {
        for (let dc = 0; dc < colSpan; dc += 1) {
          const targetRow = (grid[r + dr] ??= []);
          // 内容只保留在合并区域的左上角，其余位置补空单元格
          targetRow[col + dc] = dr === 0 && dc === 0 ? content : null;
        }
      }

      col += colSpan;
    }
  });

  const colCount = grid.reduce((max, row) => Math.max(max, row.length), 0);
  if (!colCount) {
    return;
  }

  const cellHtml = (cell: GridCell | null, tag: 'th' | 'td'): string => {
    const align = cell?.align ? ` style="text-align:${cell.align}"` : '';
    return `<${tag}${align}>${cell?.html ?? ''}</${tag}>`;
  };

  const rowHtml = (row: (GridCell | null)[], tag: 'th' | 'td'): string =>
    `<tr>${Array.from({ length: colCount }, (_, c) => cellHtml(row[c] ?? null, tag)).join('')}</tr>`;

  // GFM 强制要求表头行，首行一律作为表头输出
  const head = rowHtml(grid[0] ?? [], 'th');
  const body = grid
    .slice(1)
    .map((row) => rowHtml(row, 'td'))
    .join('');

  table.innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`;
}

/**
 * 清洗粘贴板里的 HTML；内容不含表格时返回 null（交由编辑器默认流程处理）。
 *
 * 返回的是整个 body 的 HTML——粘贴内容可能同时包含正文段落和表格，
 * 非表格部分原样保留，只有表格会被重建。
 */
export function normalizePastedTableHtml(html: string): string | null {
  if (!html || !/<table[\s>]/i.test(html) || typeof DOMParser === 'undefined') {
    return null;
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = Array.from(doc.body.querySelectorAll('table'));
  if (!tables.length) {
    return null;
  }

  stripNoise(doc.body);
  tables.forEach(rebuildTable);

  return doc.body.innerHTML;
}

/** 粘贴内容是否包含表格（供编辑器判断是否走清洗流程） */
export function containsTable(html: string | undefined): boolean {
  return !!html && /<table[\s>]/i.test(html);
}
