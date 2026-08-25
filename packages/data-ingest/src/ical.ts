/**
 * 极简 iCalendar (ICS) 解析器（无外部依赖）
 *
 * 用于解析用户导出的日历文件（如校历 / 课程表），抽取 VEVENT 并映射为归一化课程。
 * 只覆盖常见字段，不追求完整 RFC5545；无法识别的字段留作告警。
 */

export interface CalEvent {
  uid: string;
  summary?: string;
  location?: string;
  description?: string;
  dtstart: string; // 原始字符串
  dtend?: string;
  rrule?: string;
}

export interface CalCalendar {
  url?: string;
  name?: string;
  events: CalEvent[];
}

/** 解析 UNFOLDED 的 ICS 行（续行以空格/Tab 开头） */
function unfoldLines(text: string): string[] {
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (raw.startsWith(' ') || raw.startsWith('\t')) {
      if (lines.length > 0) lines[lines.length - 1] += raw.slice(1);
    } else {
      lines.push(raw);
    }
  }
  return lines;
}

function decodeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

/** 解析 ICS，返回 VEVENT 列表 */
export function parseIcs(text: string): CalCalendar {
  const calendar: CalCalendar = { events: [] };
  const lines = unfoldLines(text);
  let inEvent = false;
  let current: Partial<CalEvent> = {};

  const flush = () => {
    if (current.uid) calendar.events.push(current as CalEvent);
    current = {};
    inEvent = false;
  };

  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).toUpperCase();
    const value = line.slice(colon + 1);

    if (key === 'BEGIN') {
      if (value.trim().toUpperCase() === 'VEVENT') {
        inEvent = true;
        current = {};
      }
      continue;
    }
    if (key === 'END') {
      if (inEvent && value.trim().toUpperCase() === 'VEVENT') flush();
      continue;
    }
    if (inEvent) {
      // 去掉 VALUE=... / 参数段，取属性名
      const prop = key.split(';')[0].toUpperCase();
      switch (prop) {
        case 'UID':
          current.uid = decodeText(value);
          break;
        case 'SUMMARY':
          current.summary = decodeText(value);
          break;
        case 'LOCATION':
          current.location = decodeText(value);
          break;
        case 'DESCRIPTION':
          current.description = decodeText(value);
          break;
        case 'DTSTART':
          current.dtstart = value;
          break;
        case 'DTEND':
          current.dtend = value;
          break;
        case 'RRULE':
          current.rrule = value;
          break;
      }
    }
  }
  if (calendar.name === undefined) calendar.name = undefined;
  return calendar;
}

/** 解析 DTSTART 值（支持 ISO 基本格式 YYYYMMDDTHHMMSS 或带 TZID 后缀） */
export function parseCalDateTime(value: string): Date | undefined {
  const m = /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?/.exec(value);
  if (!m) return undefined;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0)));
}

export function dateToWeekday(d: Date): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  // getUTCDay(): 0=Sunday … 6=Saturday -> 7=Sunday,1=Monday…
  const day = d.getUTCDay();
  return day === 0 ? 7 : day as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export function datePad(n: number): string {
  return String(n).padStart(2, '0');
}
