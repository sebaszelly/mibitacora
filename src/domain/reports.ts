import { type DateStr, type Range, eachDay, minDate } from './dates';
import { type Completion, type HabitData, type Streak, completion, daySummary, streak, valueIn } from './rules';

export interface HabitReport {
  data: HabitData;
  completion: Completion;
  streak: Streak;
  /** Suma del periodo (ml, minutos, veces) o último valor de una medición. */
  total: number;
  /** Días del periodo con algún registro. */
  activeDays: number;
  best: { date: DateStr; value: number } | null;
  /** Mediciones: primer y último valor del periodo. */
  first: number | null;
  last: number | null;
  lastDate: DateStr | null;
}

export function habitReport(data: HabitData, range: Range, today: DateStr): HabitReport {
  const days = eachDay({ start: range.start, end: minDate(range.end, today) });
  let best: HabitReport['best'] = null;
  let first: number | null = null;
  let last: number | null = null;
  let activeDays = 0;
  for (const d of days) {
    const v = data.byDay.get(d);
    if (v === undefined || v === 0) continue;
    activeDays += 1;
    if (first === null) first = v;
    last = v;
    if (!best || v > best.value) best = { date: d, value: v };
  }
  let lastDate: DateStr | null = null;
  for (const [d, v] of data.byDay) if (v > 0 && d <= today && (lastDate === null || d > lastDate)) lastDate = d;
  return { data, completion: completion(data, range, today), streak: streak(data, today), total: valueIn(data, range), activeDays, best, first, last, lastDate };
}

export interface Overall {
  done: number;
  scheduled: number;
  pct: number | null;
  perfectDays: number;
  best: HabitReport | null;
  worst: HabitReport | null;
}

/** Resumen general: periodos cumplidos ÷ programados entre todos los hábitos con meta. */
export function overall(reports: HabitReport[], all: HabitData[], range: Range, today: DateStr): Overall {
  let done = 0;
  let scheduled = 0;
  let best: HabitReport | null = null;
  let worst: HabitReport | null = null;
  for (const r of reports) {
    const c = r.completion;
    if (c.pct === null) continue;
    done += c.done;
    scheduled += c.scheduled;
    if (!best || c.pct > best.completion.pct!) best = r;
    if (!worst || c.pct < worst.completion.pct!) worst = r;
  }
  if (best && worst && best === worst) worst = null;
  let perfectDays = 0;
  for (const d of eachDay({ start: range.start, end: minDate(range.end, today) })) if (daySummary(all, d, today).perfect) perfectDays += 1;
  return { done, scheduled, pct: scheduled === 0 ? null : Math.round((done / scheduled) * 100), perfectDays, best, worst };
}
