import { useLiveQuery } from 'dexie-react-hooks';
import { type ReactNode, createContext, useContext, useMemo } from 'react';
import { db } from '../db/db';
import type { DateStr } from '../domain/dates';
import { sessionDays } from '../domain/gym';
import { type HabitData, prepare } from '../domain/rules';
import type { BodyMetric, Category, Habit, HabitGoal, HabitLog, HabitPause, MuscleGroup, Workout, WorkoutSet } from '../domain/types';
import { type WeightPoint, weightSeries } from '../domain/weight';

export interface AppData {
  categories: Category[];
  catById: Map<string, Category>;
  /** Hábitos no borrados, en su orden. Incluye los archivados. */
  habits: Habit[];
  goals: HabitGoal[];
  pauses: HabitPause[];
  logs: HabitLog[];
  datas: HabitData[];
  dataById: Map<string, HabitData>;
  groups: MuscleGroup[];
  workouts: Workout[];
  sets: WorkoutSet[];
  metrics: BodyMetric[];
  weight: WeightPoint[];
  meta: Map<string, unknown>;
}

const alive = <T extends { deleted_at: string | null }>(rows: T[]): T[] => rows.filter((r) => r.deleted_at === null);
const bySort = <T extends { sort_order: number }>(a: T, b: T): number => a.sort_order - b.sort_order;

async function load() {
  const [categories, habits, goals, pauses, logs, groups, workouts, sets, metrics, meta] = await Promise.all([
    db.categories.toArray(),
    db.habits.toArray(),
    db.habit_goals.toArray(),
    db.habit_pauses.toArray(),
    db.habit_logs.toArray(),
    db.muscle_groups.toArray(),
    db.workouts.toArray(),
    db.workout_sets.toArray(),
    db.body_metrics.toArray(),
    db.meta.toArray(),
  ]);
  return { categories, habits, goals, pauses, logs, groups, workouts, sets, metrics, meta };
}

const Ctx = createContext<AppData | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const raw = useLiveQuery(load);
  const data = useMemo<AppData | null>(() => {
    if (!raw) return null;
    const categories = alive(raw.categories).sort(bySort);
    const habits = alive(raw.habits).sort(bySort);
    const logs = alive(raw.logs);
    const workouts = alive(raw.workouts);
    const sets = alive(raw.sets);
    const metrics = alive(raw.metrics);
    const weight = weightSeries(metrics);
    const gymDays = sessionDays(workouts, sets);
    const weightDays = new Map<DateStr, number>(weight.map((p) => [p.date, p.kg]));
    const logsByHabit = new Map<string, HabitLog[]>();
    for (const l of logs) {
      const list = logsByHabit.get(l.habit_id);
      if (list) list.push(l);
      else logsByHabit.set(l.habit_id, [l]);
    }
    const datas = habits.map((h) =>
      prepare(h, raw.goals, raw.pauses, logsByHabit.get(h.id) ?? [], h.module === 'gym' ? gymDays : h.module === 'weight' ? weightDays : undefined),
    );
    return {
      categories,
      catById: new Map(categories.map((c) => [c.id, c])),
      habits,
      goals: alive(raw.goals),
      pauses: alive(raw.pauses),
      logs,
      datas,
      dataById: new Map(datas.map((d) => [d.habit.id, d])),
      groups: alive(raw.groups).sort(bySort),
      workouts,
      sets,
      metrics,
      weight,
      meta: new Map(raw.meta.map((m) => [m.key, m.value])),
    };
  }, [raw]);
  if (!data) return null;
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useData(): AppData {
  const data = useContext(Ctx);
  if (!data) throw new Error('useData fuera de DataProvider');
  return data;
}
