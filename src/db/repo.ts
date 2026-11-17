import type { Table } from 'dexie';
import { type DateStr, addDays } from '../domain/dates';
import type { Base, HabitGoal, HabitLog } from '../domain/types';
import { type BitacoraDB, db as defaultDb } from './db';

export const newId = (): string => crypto.randomUUID();
const nowIso = (): string => new Date().toISOString();

export async function getMeta<T>(db: BitacoraDB, key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(db: BitacoraDB, key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

/** Identificador local del dueño de los datos. En la fase 3 se enlaza con la cuenta. */
export async function getUserId(db: BitacoraDB = defaultDb): Promise<string> {
  const existing = await getMeta<string>(db, 'user_id');
  if (existing) return existing;
  const id = newId();
  await setMeta(db, 'user_id', id);
  return id;
}

type Fields<T extends Base> = Omit<T, keyof Base>;

export function stamp<T extends Base>(user_id: string, fields: Fields<T>, at: string = nowIso()): T {
  return { id: newId(), user_id, created_at: at, updated_at: at, deleted_at: null, ...fields } as T;
}

export async function insert<T extends Base>(table: Table<T, string>, fields: Fields<T>, db: BitacoraDB = defaultDb): Promise<T> {
  const row = stamp<T>(await getUserId(db), fields);
  await table.add(row);
  return row;
}

export async function patch<T extends Base>(table: Table<T, string>, id: string, changes: Partial<Fields<T>>): Promise<void> {
  const row = await table.get(id);
  if (!row) throw new Error(`No existe el registro ${id}`);
  await table.put({ ...row, ...changes, updated_at: nowIso() });
}

/** Borrado lógico: el registro queda en la papelera y se puede restaurar. */
export async function softDelete<T extends Base>(table: Table<T, string>, id: string): Promise<void> {
  const row = await table.get(id);
  if (!row) return;
  const at = nowIso();
  await table.put({ ...row, deleted_at: at, updated_at: at });
}

export async function restore<T extends Base>(table: Table<T, string>, id: string): Promise<void> {
  const row = await table.get(id);
  if (!row) return;
  await table.put({ ...row, deleted_at: null, updated_at: nowIso() });
}

export interface LogInput {
  value?: number | null;
  duration_min?: number | null;
  note?: string | null;
  extra?: Record<string, unknown> | null;
}

/** Registra algo en un hábito. Devuelve el registro para poder deshacerlo. */
export function logHabit(habit_id: string, date: DateStr, input: LogInput = {}, db: BitacoraDB = defaultDb): Promise<HabitLog> {
  return insert<HabitLog>(
    db.habit_logs,
    {
      habit_id,
      date,
      value: input.value ?? null,
      duration_min: input.duration_min ?? null,
      note: input.note ?? null,
      extra: input.extra ?? null,
    },
    db,
  );
}

export interface GoalInput {
  target_value: number;
  period: HabitGoal['period'];
  direction: HabitGoal['direction'];
}

/**
 * Cambia la meta de un hábito sin tocar el pasado: cierra la versión vigente
 * el día anterior y abre una nueva desde `from`. Si la versión vigente empezó
 * ese mismo día, se corrige en su sitio en lugar de crear otra.
 */
export async function setGoal(habit_id: string, goal: GoalInput, from: DateStr, db: BitacoraDB = defaultDb): Promise<HabitGoal> {
  return db.transaction('rw', db.habit_goals, db.meta, async () => {
    const rows = (await db.habit_goals.where('habit_id').equals(habit_id).toArray()).filter((g) => g.deleted_at === null);
    const current = rows.find((g) => g.valid_from <= from && (g.valid_to === null || g.valid_to >= from));
    if (current && current.valid_from === from) {
      await patch<HabitGoal>(db.habit_goals, current.id, goal);
      return { ...current, ...goal };
    }
    if (current) await patch<HabitGoal>(db.habit_goals, current.id, { valid_to: addDays(from, -1) });
    return insert<HabitGoal>(db.habit_goals, { habit_id, ...goal, valid_from: from, valid_to: current?.valid_to ?? null }, db);
  });
}
