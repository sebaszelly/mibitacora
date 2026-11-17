import { type DateStr, type Range, diffDays, isoWeek, weekday } from './dates';

const NNBSP = ' ';
const NBSP = ' ';

/** 1500 → "1 500". Separador de miles con espacio fino, como en la spec. */
export function fmtInt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
}

/** Enteros con miles; decimales con punto y hasta `decimals` cifras (72.4). */
export function fmtNum(n: number, decimals = 1): string {
  if (Number.isInteger(n)) return fmtInt(n);
  const fixed = n.toFixed(decimals);
  const [int = '0', dec = ''] = fixed.split('.');
  const trimmed = dec.replace(/0+$/, '');
  return trimmed ? `${fmtInt(Number(int))}.${trimmed}` : fmtInt(Number(int));
}

export const fmtPct = (n: number): string => `${n}${NBSP}%`;

/** Acepta "72,4" y "72.4". Devuelve null si no es un número mayor que cero. */
export function parseNum(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
export const WEEKDAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const dayNum = (d: DateStr): number => Number(d.slice(8, 10));
export const monthIdx = (d: DateStr): number => Number(d.slice(5, 7)) - 1;
export const year = (d: DateStr): number => Number(d.slice(0, 4));
export const weekdayName = (d: DateStr): string => WEEKDAYS[weekday(d) - 1]!;
export const monthName = (d: DateStr): string => MONTHS[monthIdx(d)]!;

/** "martes 17 de noviembre" */
export const longDate = (d: DateStr): string => `${weekdayName(d)} ${dayNum(d)} de ${monthName(d)}`;
/** "17 nov" */
export const shortDate = (d: DateStr): string => `${dayNum(d)} ${MONTHS_SHORT[monthIdx(d)]}`;
/** "noviembre 2026 · semana 47" */
export const monthWeek = (d: DateStr): string => `${monthName(d)} ${year(d)} · semana ${isoWeek(d)}`;

export function rangeLabel(r: Range): string {
  if (r.start.slice(0, 7) === r.end.slice(0, 7) && dayNum(r.start) === 1 && diffDays(r.start, r.end) >= 27) return `${monthName(r.start)} ${year(r.start)}`;
  return `${shortDate(r.start)} – ${shortDate(r.end)}`;
}

/** "hoy", "ayer", "hace 3 días" */
export function ago(d: DateStr, today: DateStr): string {
  const n = diffDays(d, today);
  if (n <= 0) return 'hoy';
  if (n === 1) return 'ayer';
  return `hace ${n} días`;
}

export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
