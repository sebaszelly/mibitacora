import { toast } from 'sonner';
import { db } from '../db/db';
import { type LogInput, insert, logHabit, restore, softDelete } from '../db/repo';
import type { DateStr } from '../domain/dates';
import type { BodyMetric, Habit, Workout, WorkoutSet } from '../domain/types';

/** Cada registro muestra un aviso breve con "Deshacer". */
function undoable(message: string, undo: () => Promise<unknown>): void {
  toast(message, { action: { label: 'Deshacer', onClick: () => void undo() } });
}

export async function logWithUndo(habit: Habit, date: DateStr, input: LogInput, message: string): Promise<void> {
  const log = await logHabit(habit.id, date, input);
  undoable(message, () => softDelete(db.habit_logs, log.id));
}

/** Sí/No: un toque marca, otro toque desmarca. */
export async function toggleYesNo(habit: Habit, date: DateStr, name: string): Promise<void> {
  const existing = (await db.habit_logs.where('[habit_id+date]').equals([habit.id, date]).toArray()).filter((l) => l.deleted_at === null);
  if (existing.length === 0) return logWithUndo(habit, date, {}, `${name} · hecho`);
  for (const l of existing) await softDelete(db.habit_logs, l.id);
  undoable(`${name} · desmarcado`, async () => {
    for (const l of existing) await restore(db.habit_logs, l.id);
  });
}

export async function removeLog(id: string): Promise<void> {
  await softDelete(db.habit_logs, id);
  undoable('Registro borrado', () => restore(db.habit_logs, id));
}

export async function addWeight(date: DateStr, kg: number, time: string | null): Promise<void> {
  const row = await insert<BodyMetric>(db.body_metrics, { date, time, weight_kg: kg, body_fat_pct: null, measurements: null });
  undoable(`Peso · ${kg} kg`, () => softDelete(db.body_metrics, row.id));
}

export async function removeWeight(id: string): Promise<void> {
  await softDelete(db.body_metrics, id);
  undoable('Peso borrado', () => restore(db.body_metrics, id));
}

/** Gym rápido: suma series a un grupo muscular en la sesión de ese día (la crea si no existe). */
export async function addSets(groupId: string, groupName: string, date: DateStr, count = 1): Promise<void> {
  const set = await db.transaction('rw', db.workouts, db.workout_sets, db.meta, async () => {
    let workout = (await db.workouts.where('date').equals(date).toArray()).find((w) => w.deleted_at === null);
    workout ??= await insert<Workout>(db.workouts, { date, duration_min: null, rpe: null, note: null, routine_id: null });
    return insert<WorkoutSet>(db.workout_sets, { workout_id: workout.id, muscle_group_id: groupId, exercise_id: null, weight_kg: null, reps: null, set_count: count });
  });
  undoable(`+${count} ${count === 1 ? 'serie' : 'series'} · ${groupName}`, () => softDelete(db.workout_sets, set.id));
}

export async function removeSet(id: string): Promise<void> {
  await softDelete(db.workout_sets, id);
  undoable('Serie borrada', () => restore(db.workout_sets, id));
}
