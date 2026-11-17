/**
 * Fechas de calendario como texto 'YYYY-MM-DD'.
 *
 * Los registros guardan el día local en que ocurrieron, no un instante UTC:
 * así un vaso de agua a las 23:30 nunca cae en el día siguiente. El orden
 * alfabético de estas cadenas es el orden cronológico.
 */
export type DateStr = string;

export interface Range {
  start: DateStr;
  end: DateStr;
}

export type PeriodKind = 'day' | 'week' | 'month';

const DAY_MS = 86_400_000;
const pad = (n: number): string => String(n).padStart(2, '0');

function toUTC(s: DateStr): number {
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms: number): DateStr {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Día local del dispositivo para un instante dado. */
export function fromDate(d: Date): DateStr {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(): DateStr {
  return fromDate(new Date());
}

export function isDateStr(s: unknown): s is DateStr {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && fromUTC(toUTC(s)) === s;
}

export function addDays(s: DateStr, n: number): DateStr {
  return fromUTC(toUTC(s) + n * DAY_MS);
}

/** Días de `a` a `b` (positivo si `b` es posterior). */
export function diffDays(a: DateStr, b: DateStr): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
}

/** 1 = lunes … 7 = domingo. */
export function weekday(s: DateStr): number {
  const js = new Date(toUTC(s)).getUTCDay();
  return js === 0 ? 7 : js;
}

/** La semana va de lunes a domingo. */
export function weekStart(s: DateStr): DateStr {
  return addDays(s, 1 - weekday(s));
}

export function weekEnd(s: DateStr): DateStr {
  return addDays(s, 7 - weekday(s));
}

export function monthStart(s: DateStr): DateStr {
  return `${s.slice(0, 8)}01`;
}

export function monthEnd(s: DateStr): DateStr {
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  return fromUTC(Date.UTC(y, m, 0));
}

/** Quincena: del 1 al 15 y del 16 al fin de mes. */
export function fortnight(s: DateStr): Range {
  const first = Number(s.slice(8, 10)) <= 15;
  return first
    ? { start: monthStart(s), end: `${s.slice(0, 8)}15` }
    : { start: `${s.slice(0, 8)}16`, end: monthEnd(s) };
}

/** Número de semana ISO (la semana 1 contiene el primer jueves del año). */
export function isoWeek(s: DateStr): number {
  const thursday = addDays(weekStart(s), 3);
  const jan1 = `${thursday.slice(0, 4)}-01-01`;
  return Math.floor(diffDays(jan1, thursday) / 7) + 1;
}

export function periodOf(kind: PeriodKind, s: DateStr): Range {
  if (kind === 'day') return { start: s, end: s };
  if (kind === 'week') return { start: weekStart(s), end: weekEnd(s) };
  return { start: monthStart(s), end: monthEnd(s) };
}

export function eachDay(range: Range): DateStr[] {
  const out: DateStr[] = [];
  for (let d = range.start; d <= range.end; d = addDays(d, 1)) out.push(d);
  return out;
}

/**
 * Periodos que terminan dentro del rango. Una semana partida entre dos meses
 * cuenta en el mes donde termina, para que ningún periodo se cuente dos veces.
 */
export function periodsEndingIn(kind: PeriodKind, range: Range): Range[] {
  const out: Range[] = [];
  let p = periodOf(kind, range.start);
  while (p.end <= range.end) {
    out.push(p);
    p = periodOf(kind, addDays(p.end, 1));
  }
  return out;
}

/** Periodo anterior de igual duración, para comparar reportes. */
export function previousRange(range: Range): Range {
  const isWholeMonth = range.start === monthStart(range.start) && range.end === monthEnd(range.start);
  if (isWholeMonth) {
    const prevEnd = addDays(range.start, -1);
    return { start: monthStart(prevEnd), end: prevEnd };
  }
  const len = diffDays(range.start, range.end) + 1;
  return { start: addDays(range.start, -len), end: addDays(range.start, -1) };
}

export const minDate = (a: DateStr, b: DateStr): DateStr => (a <= b ? a : b);
export const maxDate = (a: DateStr, b: DateStr): DateStr => (a >= b ? a : b);
