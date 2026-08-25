/**
 * 极简 CSV 解析器（无外部依赖）
 *
 * 支持：RFC4180 引号字段、嵌入逗号/换行、CRLF/LF、`#` 注释行、可配置分隔符。
 * 供 `manual` 适配器解析用户导出的 CSV（课表 / 评价 / 成绩）。
 */

export type CsvRow = Record<string, string>;

export interface CsvOptions {
  delimiter?: string;
  /** 是否跳过以 # 开头的行 */
  skipComments?: boolean;
  /** 是否跳过完全空白的行 */
  skipEmptyLines?: boolean;
}

/** 把 CSV 文本拆成「行→单元格」的原始矩阵 */
export function parseCsvMatrix(text: string, opts: { delimiter?: string } = {}): string[][] {
  const delimiter = opts.delimiter ?? ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** 把矩阵按首行作为表头转成对象数组 */
export function csvToRows(text: string, opts: CsvOptions = {}): CsvRow[] {
  const { delimiter = ',', skipComments = true, skipEmptyLines = true } = opts;
  let lines = text.split(/\r?\n/);
  if (skipComments) lines = lines.filter((l) => !l.trimStart().startsWith('#'));
  const matrix = parseCsvMatrix(lines.join('\n'), { delimiter });
  const clean = skipEmptyLines ? matrix.filter((r) => r.some((c) => c.trim() !== '')) : matrix;
  if (clean.length === 0) return [];
  const header = clean[0].map((h) => h.trim());
  return clean.slice(1).map((cells) => {
    const obj: CsvRow = {};
    header.forEach((h, idx) => {
      if (h) obj[h] = (cells[idx] ?? '').trim();
    });
    return obj;
  });
}

/** 读取一个字段（兼容别名，按顺序取第一个非空） */
export function pick(row: CsvRow, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== '') return v;
  }
  return undefined;
}
