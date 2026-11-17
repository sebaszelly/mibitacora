import { type DateStr, addDays } from './dates';
import type { BodyMetric } from './types';

export interface WeightPoint {
  date: DateStr;
  kg: number;
  /** Media móvil de los 7 días que terminan en esta fecha. */
  avg: number;
}

/** Un punto por día (el último registro del día), en orden cronológico, con su media móvil de 7 días. */
export function weightSeries(metrics: BodyMetric[]): WeightPoint[] {
  const byDay = new Map<DateStr, BodyMetric>();
  for (const m of metrics) {
    if (m.deleted_at !== null || m.weight_kg === null) continue;
    const prev = byDay.get(m.date);
    if (!prev || m.created_at > prev.created_at) byDay.set(m.date, m);
  }
  const days = [...byDay.keys()].sort();
  return days.map((date) => {
    const from = addDays(date, -6);
    const window = days.filter((d) => d >= from && d <= date).map((d) => byDay.get(d)!.weight_kg!);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    return { date, kg: byDay.get(date)!.weight_kg!, avg: Math.round(avg * 100) / 100 };
  });
}

/** Variación entre el último peso y el más reciente de hace `days` días o antes. null si no hay con qué comparar. */
export function weightDelta(series: WeightPoint[], days: number): number | null {
  const last = series[series.length - 1];
  if (!last) return null;
  const limit = addDays(last.date, -days);
  let ref: WeightPoint | undefined;
  for (const p of series) if (p.date <= limit) ref = p;
  if (!ref) return null;
  return Math.round((last.kg - ref.kg) * 10) / 10;
}
