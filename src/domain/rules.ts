import {
  type DateStr,
  type PeriodKind,
  type Range,
  addDays,
  eachDay,
  fromDate,
  maxDate,
  minDate,
  periodOf,
  periodsEndingIn,
  weekday,
} from './dates';
import type { Habit, HabitGoal, HabitLog, HabitPause } from './types';

/**
 * Estado de un periodo (un día, una semana o un mes) para un hábito.
 *
 * - done: cumplido.
 * - partial: hubo avance pero no alcanzó la meta.
 * - missed: periodo cerrado sin avance (o límite superado en metas "como mucho").
 * - pending: periodo todavía abierto y sin avance; aún no es un fallo.
 * - paused: en pausa; no cuenta en contra.
 * - unscheduled: no programado.
 * - untracked: sin meta (eventos, mediciones); solo se cuenta.
 */
export type Status = 'done' | 'partial' | 'missed' | 'pending' | 'paused' | 'unscheduled' | 'untracked';

export interface PeriodResult {
  status: Status;
  range: Range;
  kind: PeriodKind;
  /** Suma, minutos o veces registradas en el periodo. */
  value: number;
  target: number | null;
  direction: 'min' | 'max' | null;
  /** El periodo incluye hoy o es futuro: su estado todavía puede cambiar. */
  open: boolean;
}

export interface HabitData {
  habit: Habit;
  goals: HabitGoal[];
  pauses: HabitPause[];
  /** Valor acumulado por día. */
  byDay: Map<DateStr, number>;
}

const alive = <T extends { deleted_at: string | null }>(rows: T[]): T[] => rows.filter((r) => r.deleted_at === null);

/** Cuánto aporta un registro al total de su día, según el tipo de hábito. */
export function logValue(habit: Habit, log: HabitLog): number {
  switch (habit.type) {
    case 'quantity':
    case 'measurement':
      return log.value ?? 0;
    case 'duration':
      return log.duration_min ?? 0;
    default:
      return log.value ?? 1;
  }
}

/**
 * Junta lo necesario para evaluar un hábito. `dayValues` reemplaza a los
 * registros cuando el avance viene de otro módulo (las sesiones de gym).
 */
export function prepare(
  habit: Habit,
  goals: HabitGoal[],
  pauses: HabitPause[],
  logs: HabitLog[],
  dayValues?: Map<DateStr, number>,
): HabitData {
  let byDay = dayValues;
  if (!byDay) {
    byDay = new Map();
    for (const log of alive(logs)) {
      if (log.habit_id !== habit.id) continue;
      if (habit.type === 'measurement') byDay.set(log.date, logValue(habit, log));
      else byDay.set(log.date, (byDay.get(log.date) ?? 0) + logValue(habit, log));
    }
    if (habit.type === 'yesno') for (const [d, v] of byDay) byDay.set(d, Math.min(v, 1));
  }
  return {
    habit,
    goals: alive(goals).filter((g) => g.habit_id === habit.id),
    pauses: alive(pauses).filter((p) => p.habit_id === habit.id),
    byDay,
  };
}

/** La meta vigente en una fecha. El pasado se evalúa con la meta de entonces. */
export function goalOn(goals: HabitGoal[], date: DateStr): HabitGoal | undefined {
  let found: HabitGoal | undefined;
  for (const g of goals) {
    if (g.valid_from > date) continue;
    if (g.valid_to !== null && g.valid_to < date) continue;
    if (!found || g.valid_from > found.valid_from) found = g;
  }
  return found;
}

export function habitStart(habit: Habit): DateStr {
  return habit.schedule.start_date ?? fromDate(new Date(habit.created_at));
}

/** Último día programado: fin del rango o día en que se archivó. */
export function habitEnd(habit: Habit): DateStr | null {
  const archived = habit.archived_at ? addDays(fromDate(new Date(habit.archived_at)), -1) : null;
  const end = habit.schedule.end_date ?? null;
  if (archived && end) return minDate(archived, end);
  return archived ?? end;
}

export function isScheduledDay(habit: Habit, date: DateStr): boolean {
  if (date < habitStart(habit)) return false;
  const end = habitEnd(habit);
  if (end !== null && date > end) return false;
  const days = habit.schedule.days;
  return !days || days.length === 0 || days.includes(weekday(date));
}

export function isPausedOn(pauses: HabitPause[], date: DateStr): boolean {
  return pauses.some((p) => p.start_date <= date && (p.end_date === null || date <= p.end_date));
}

export function valueIn(data: HabitData, range: Range): number {
  if (data.habit.type === 'measurement') {
    let last = 0;
    for (const d of eachDay(range)) if (data.byDay.has(d)) last = data.byDay.get(d)!;
    return last;
  }
  let sum = 0;
  for (const d of eachDay(range)) sum += data.byDay.get(d) ?? 0;
  return sum;
}

/** El periodo de la meta vigente en una fecha, o null si el hábito no tiene meta ese día. */
export function goalKindOn(data: HabitData, date: DateStr): PeriodKind | null {
  if (data.habit.type === 'event' || data.habit.type === 'measurement') return null;
  return goalOn(data.goals, date)?.period ?? null;
}

/**
 * Evalúa un periodo completo.
 *
 * Reglas que no están en la spec y conviene tener a la vista:
 * - Una semana o un mes se evalúa con la meta vigente en su último día. Si la
 *   meta cambia a mitad de semana, la semana en curso usa la nueva y las
 *   anteriores conservan la suya.
 * - Si el hábito empezó o terminó a mitad de una semana o un mes, ese periodo
 *   solo cuenta si se cumplió. No se castiga una semana incompleta.
 */
export function evalPeriod(data: HabitData, kind: PeriodKind, date: DateStr, today: DateStr): PeriodResult {
  const range = periodOf(kind, date);
  const { habit, goals, pauses } = data;
  const value = valueIn(data, range);
  const open = today <= range.end;
  const base = { range, kind, value, open };
  const result = (status: Status, goal?: HabitGoal): PeriodResult => ({
    ...base,
    status,
    target: goal?.target_value ?? null,
    direction: goal?.direction ?? null,
  });

  if (habit.type === 'event' || habit.type === 'measurement') return result('untracked');

  const goal = goalOn(goals, range.end) ?? (open ? goalOn(goals, maxDate(range.start, minDate(today, range.end))) : undefined);
  if (!goal || goal.period !== kind) return result('untracked');

  const scheduled = eachDay(range).filter((d) => isScheduledDay(habit, d));
  if (scheduled.length === 0) return result('unscheduled', goal);
  if (scheduled.every((d) => isPausedOn(pauses, d))) return result('paused', goal);

  if (goal.direction === 'max') return result(value <= goal.target_value ? 'done' : 'missed', goal);

  if (value >= goal.target_value) return result('done', goal);
  if (today < range.start) return result('pending', goal);
  if (open) return result(value > 0 ? 'partial' : 'pending', goal);

  const end = habitEnd(habit);
  const incomplete = kind !== 'day' && (habitStart(habit) > range.start || (end !== null && end < range.end));
  if (incomplete) return result('unscheduled', goal);
  return result(value > 0 ? 'partial' : 'missed', goal);
}

/** Estado de un hábito para mostrarlo en un día: el del periodo de su meta que contiene ese día. */
export function evalOn(data: HabitData, date: DateStr, today: DateStr): PeriodResult {
  const kind = goalKindOn(data, date) ?? 'day';
  return evalPeriod(data, kind, date, today);
}

export interface DaySummary {
  done: number;
  total: number;
  /** null cuando ese día no había nada programado. */
  pct: number | null;
  perfect: boolean;
}

/**
 * "% del día cumplido": solo cuentan los hábitos con meta diaria. Los
 * semanales y mensuales se muestran aparte y se evalúan al cerrar su periodo.
 */
export function daySummary(all: HabitData[], date: DateStr, today: DateStr): DaySummary {
  let done = 0;
  let total = 0;
  for (const data of all) {
    if (goalKindOn(data, date) !== 'day') continue;
    const r = evalPeriod(data, 'day', date, today);
    if (r.status === 'untracked' || r.status === 'unscheduled' || r.status === 'paused') continue;
    total += 1;
    if (r.status === 'done') done += 1;
  }
  return { done, total, pct: total === 0 ? null : Math.round((done / total) * 100), perfect: total > 0 && done === total };
}

export interface Completion {
  done: number;
  scheduled: number;
  /** Periodos cumplidos ÷ periodos programados, sin contar pausas. null si no hubo ninguno. */
  pct: number | null;
}

const COUNTED: ReadonlySet<Status> = new Set(['done', 'partial', 'missed']);

/**
 * Cumplimiento de un hábito en un rango. Un periodo abierto solo entra en la
 * cuenta si ya está cumplido: la semana en curso no baja el porcentaje.
 */
export function completion(data: HabitData, range: Range, today: DateStr): Completion {
  let done = 0;
  let scheduled = 0;
  for (const kind of ['day', 'week', 'month'] as const) {
    for (const p of periodsEndingIn(kind, range)) {
      const r = evalPeriod(data, kind, p.start, today);
      if (!COUNTED.has(r.status)) continue;
      if (r.open && r.status !== 'done') continue;
      scheduled += 1;
      if (r.status === 'done') done += 1;
    }
  }
  return { done, scheduled, pct: scheduled === 0 ? null : Math.round((done / scheduled) * 100) };
}

export interface Streak {
  current: number;
  best: number;
  /** Los hábitos semanales cuentan su racha en semanas cumplidas. */
  unit: PeriodKind;
}

/**
 * Racha actual y máxima. Las pausas y los periodos no programados no la
 * rompen; un periodo abierto sin cumplir todavía tampoco.
 */
export function streak(data: HabitData, today: DateStr): Streak {
  const latest = [...data.goals].sort((a, b) => (a.valid_from < b.valid_from ? 1 : -1))[0];
  const unit = goalKindOn(data, today) ?? latest?.period ?? 'day';
  let current = 0;
  let best = 0;
  const start = habitStart(data.habit);
  if (start > today) return { current, best, unit };
  let p = periodOf(unit, start);
  while (p.start <= today) {
    const r = evalPeriod(data, unit, p.start, today);
    if (r.status === 'done') {
      current += 1;
      best = Math.max(best, current);
    } else if (!r.open && (r.status === 'missed' || r.status === 'partial')) {
      current = 0;
    }
    p = periodOf(unit, addDays(p.end, 1));
  }
  return { current, best, unit };
}
