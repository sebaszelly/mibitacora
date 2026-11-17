import type { DateStr, Range } from './dates';
import type { MuscleGroup, Workout, WorkoutSet } from './types';

/** Series por día (solo sesiones con al menos una serie). */
export function setsByDay(workouts: Workout[], sets: WorkoutSet[]): Map<DateStr, number> {
  const dateOf = new Map(workouts.filter((w) => w.deleted_at === null).map((w) => [w.id, w.date]));
  const out = new Map<DateStr, number>();
  for (const s of sets) {
    if (s.deleted_at !== null) continue;
    const date = dateOf.get(s.workout_id);
    if (date) out.set(date, (out.get(date) ?? 0) + s.set_count);
  }
  return out;
}

/** Un día con series cuenta como una sesión. Alimenta el hábito Gimnasio. */
export function sessionDays(workouts: Workout[], sets: WorkoutSet[]): Map<DateStr, number> {
  const out = new Map<DateStr, number>();
  for (const [date, n] of setsByDay(workouts, sets)) if (n > 0) out.set(date, 1);
  return out;
}

/** Series por grupo muscular dentro de un rango (la semana). */
export function setsByGroup(workouts: Workout[], sets: WorkoutSet[], range: Range): Map<string, number> {
  const dateOf = new Map(workouts.filter((w) => w.deleted_at === null).map((w) => [w.id, w.date]));
  const out = new Map<string, number>();
  for (const s of sets) {
    if (s.deleted_at !== null) continue;
    const date = dateOf.get(s.workout_id);
    if (!date || date < range.start || date > range.end) continue;
    out.set(s.muscle_group_id, (out.get(s.muscle_group_id) ?? 0) + s.set_count);
  }
  return out;
}

/** below: bajo la meta. in: en rango. above: por encima del máximo. none: sin meta. */
export type GroupState = 'none' | 'below' | 'in' | 'above';

export function groupState(count: number, group: Pick<MuscleGroup, 'weekly_min_sets' | 'weekly_max_sets'>): GroupState {
  const { weekly_min_sets: min, weekly_max_sets: max } = group;
  if (min === null && max === null) return 'none';
  if (max !== null && count > max) return 'above';
  if (min !== null && count < min) return 'below';
  return 'in';
}
